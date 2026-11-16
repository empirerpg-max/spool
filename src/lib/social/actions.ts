'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createSessionClient } from '@/lib/supabase/session';
import { SOCIAL_FALLBACK, socialErrorMessage } from './errors';

export type SocialActionState = { error?: string; ok?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Only our own pages are revalidated (e.g. "/perfil/ana", "/minha-conta"). */
const isLocalPath = (p: string) => /^\/[A-Za-z0-9_\-/@%.]*$/.test(p) && !p.startsWith('//');

type Run = (db: Awaited<ReturnType<typeof createSessionClient>>, me: string, target: string) => PromiseLike<{ error: { code?: string; message?: string } | null }>;

async function run(targetId: string, path: string, op: Run, opts: { duplicateOk?: boolean } = {}): Promise<SocialActionState> {
  if (!UUID.test(targetId)) return { error: SOCIAL_FALLBACK };
  const user = await getCurrentUser();
  if (!user) return { error: socialErrorMessage({ message: 'not_signed_in' }) };
  if (user.id === targetId) return { error: SOCIAL_FALLBACK };
  const supabase = await createSessionClient();
  const { error } = await op(supabase, user.id, targetId);
  // Pressing twice (two tabs) is not an error: the row is already there.
  if (error && !(opts.duplicateOk && error.code === '23505')) {
    console.error('[social] action failed', error.message);
    return { error: socialErrorMessage(error) };
  }
  if (isLocalPath(path)) revalidatePath(path);
  revalidatePath('/minha-conta');
  return { ok: true };
}

export async function unblock(targetId: string, path: string): Promise<SocialActionState> {
  return run(targetId, path, (db, me, t) => db.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', t));
}

export async function unmute(targetId: string, path: string): Promise<SocialActionState> {
  return run(targetId, path, (db, me, t) => db.from('mutes').delete().eq('muter_id', me).eq('muted_id', t));
}

export async function follow(targetId: string, path: string): Promise<SocialActionState> {
  return run(targetId, path, (db, _me, t) => db.from('follows').insert({ followee_id: t }), { duplicateOk: true });
}

export async function unfollow(targetId: string, path: string): Promise<SocialActionState> {
  return run(targetId, path, (db, me, t) => db.from('follows').delete().eq('follower_id', me).eq('followee_id', t));
}

/** Also ends following both ways (done by the database). The person is not told. */
export async function block(targetId: string, path: string): Promise<SocialActionState> {
  return run(targetId, path, (db, _me, t) => db.from('blocks').insert({ blocked_id: t }), { duplicateOk: true });
}

/** Hides the person from my timeline and alerts only. The person is not told. */
export async function mute(targetId: string, path: string): Promise<SocialActionState> {
  return run(targetId, path, (db, _me, t) => db.from('mutes').insert({ muted_id: t }), { duplicateOk: true });
}
