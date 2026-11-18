'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServiceClient } from '@/lib/supabase/server';
import { createSessionClient } from '@/lib/supabase/session';
import { AVATAR_EXTENSION, avatarObjectPath, checkAvatar, sniffImageType } from './avatar';
import { socialErrorMessage } from './errors';
import { profileSchema } from './profile-schema';

export type ProfileState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };
export type AvatarState = { error?: string; avatarUrl?: string | null };

const AVATAR_BUCKET = 'avatars';
const BANNED = socialErrorMessage({ message: 'banned' });
const NOT_AN_IMAGE = 'A foto precisa ser JPG, PNG ou WebP.';
const STORAGE_FAIL = 'Não foi possível guardar a foto agora. Tente de novo em alguns minutos.';

function revalidateProfile(username: string | null) {
  revalidatePath('/minha-conta');
  if (username) revalidatePath(`/perfil/${username}`);
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Entre para editar seu perfil.' };
  if (user.banned) return { error: BANNED };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const out: Record<string, string> = {};
    for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
    return { fieldErrors: out };
  }
  const v = parsed.data;
  const supabase = await createSessionClient();
  const [names, details] = await Promise.all([
    supabase.from('profiles').update({ display_name: v.displayName }).eq('id', user.id),
    supabase.from('profile_details').update({
      bio: v.bio, list_public: v.listPublic, share_activity: v.shareActivity, share_ratings: v.shareRatings,
    }).eq('id', user.id),
  ]);
  const error = names.error ?? details.error;
  if (error) {
    console.error('[social] updateProfile failed', error.message);
    return { error: error.message === 'banned' ? BANNED : 'Não foi possível salvar. Tente de novo.' };
  }
  revalidateProfile(user.username);
  return { ok: true };
}

/** Answer to "Mostrar sua atividade para quem te segue?" ("Agora não" = false: never asked again). */
export async function setShareActivity(share: boolean): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.banned) return { ok: false };
  const supabase = await createSessionClient();
  const { error } = await supabase.from('profile_details').update({ share_activity: share === true }).eq('id', user.id);
  if (error) {
    console.error('[social] setShareActivity failed', error.message);
    return { ok: false };
  }
  revalidatePath('/');
  revalidatePath('/timeline');
  revalidatePath('/minha-conta');
  return { ok: true };
}

type Admin = ReturnType<typeof createServiceClient>;

async function currentAvatarUrl(admin: Admin, userId: string): Promise<string | null> {
  const { data, error } = await admin.from('profile_details').select('avatar_url').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.avatar_url as string | null | undefined) ?? null;
}

/** Best effort: the profile already points elsewhere even if the old file lingers. */
async function removeStoredAvatar(admin: Admin, userId: string, url: string | null) {
  const path = avatarObjectPath(url, userId);
  if (!path) return;
  const { error } = await admin.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) console.error('[social] old avatar not removed', error.message);
}

/**
 * Receives the photo already cropped by the browser, checks it again (including what the file really is)
 * and stores it as avatars/{userId}/{random}.webp, so nobody can guess the address from the profile.
 */
export async function uploadAvatar(formData: FormData): Promise<AvatarState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Entre para trocar sua foto.' };
  if (user.banned) return { error: BANNED };
  const file = formData.get('avatar');
  if (!(file instanceof Blob)) return { error: 'Escolha uma foto.' };
  const problem = checkAvatar(file);
  if (problem) return { error: problem };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { error: NOT_AN_IMAGE };

  try {
    const admin = createServiceClient();
    const previous = await currentAvatarUrl(admin, user.id);
    const path = `${user.id}/${randomUUID()}.${AVATAR_EXTENSION[type]}`;
    const { error: upErr } = await admin.storage.from(AVATAR_BUCKET).upload(path, bytes, { contentType: type, cacheControl: '31536000' });
    if (upErr) throw new Error(upErr.message);
    const { data } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const avatarUrl = data.publicUrl;
    const { error: dbErr } = await admin.from('profile_details').update({ avatar_url: avatarUrl }).eq('id', user.id);
    if (dbErr) throw new Error(dbErr.message);
    await removeStoredAvatar(admin, user.id, previous);
    revalidateProfile(user.username);
    return { avatarUrl };
  } catch (e) {
    console.error('[social] uploadAvatar failed', e instanceof Error ? e.message : e);
    return { error: STORAGE_FAIL };
  }
}

export async function removeAvatar(): Promise<AvatarState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Entre para trocar sua foto.' };
  try {
    const admin = createServiceClient();
    const previous = await currentAvatarUrl(admin, user.id);
    const { error: dbErr } = await admin.from('profile_details').update({ avatar_url: null }).eq('id', user.id);
    if (dbErr) throw new Error(dbErr.message);
    await removeStoredAvatar(admin, user.id, previous);
    revalidateProfile(user.username);
    return { avatarUrl: null };
  } catch (e) {
    console.error('[social] removeAvatar failed', e instanceof Error ? e.message : e);
    return { error: 'Não foi possível remover a foto agora. Tente de novo.' };
  }
}
