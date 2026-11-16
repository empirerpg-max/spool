'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServiceClient } from '@/lib/supabase/server';
import { createSessionClient } from '@/lib/supabase/session';
import { checkAvatar } from './avatar';
import { profileSchema } from './profile-schema';

export type ProfileState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };
export type AvatarState = { error?: string; avatarUrl?: string | null };

const AVATAR_BUCKET = 'avatars';
const STORAGE_FAIL = 'Não foi possível guardar a foto agora. Tente de novo em alguns minutos.';

function revalidateProfile(username: string | null) {
  revalidatePath('/minha-conta');
  if (username) revalidatePath(`/perfil/${username}`);
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Entre para editar seu perfil.' };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const out: Record<string, string> = {};
    for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
    return { fieldErrors: out };
  }
  const v = parsed.data;
  const supabase = await createSessionClient();
  const { error } = await supabase.from('profiles')
    .update({ display_name: v.displayName, bio: v.bio, list_public: v.listPublic }).eq('id', user.id);
  if (error) {
    console.error('[social] updateProfile failed', error.message);
    return { error: 'Não foi possível salvar. Tente de novo.' };
  }
  revalidateProfile(user.username);
  return { ok: true };
}

/** Receives the photo already cropped by the browser, checks it again and stores it as avatars/{userId}.webp. */
export async function uploadAvatar(formData: FormData): Promise<AvatarState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Entre para trocar sua foto.' };
  const file = formData.get('avatar');
  if (!(file instanceof Blob)) return { error: 'Escolha uma foto.' };
  const problem = checkAvatar(file);
  if (problem) return { error: problem };

  try {
    const admin = createServiceClient();
    const path = `${user.id}.webp`;
    const { error: upErr } = await admin.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
    if (upErr) throw new Error(upErr.message);
    const { data } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // The file name never changes, so a version mark makes browsers fetch the new photo.
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error: dbErr } = await admin.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    if (dbErr) throw new Error(dbErr.message);
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
    const { error: dbErr } = await admin.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    if (dbErr) throw new Error(dbErr.message);
    // Best effort: the profile already shows the initial even if the old file lingers.
    const { error: rmErr } = await admin.storage.from(AVATAR_BUCKET).remove([`${user.id}.webp`]);
    if (rmErr) console.error('[social] removeAvatar storage', rmErr.message);
    revalidateProfile(user.username);
    return { avatarUrl: null };
  } catch (e) {
    console.error('[social] removeAvatar failed', e instanceof Error ? e.message : e);
    return { error: 'Não foi possível remover a foto agora. Tente de novo.' };
  }
}
