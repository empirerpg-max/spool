'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getOrFetchWork } from '@/lib/catalog/get-work';
import { searchCatalog } from '@/lib/catalog/search';
import type { SearchHit } from '@/lib/catalog/types';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createSessionClient } from '@/lib/supabase/session';
import { SOCIAL_FALLBACK, socialErrorMessage } from './errors';
import { postSchema, replySchema, socialReportSchema } from './schemas';

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

// Publicações, respostas, curtidas e conversas acompanhadas --------------------------------------

export type PostActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const fieldErrors = (issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> =>
  Object.fromEntries(issues.map((i) => [String(i.path[0] ?? 'form'), i.message]));

function failed(where: string, error: { code?: string; message?: string }): { error: string } {
  console.error(`[social] ${where} failed`, error.message);
  return { error: socialErrorMessage(error) };
}

/** Publishes a post about a work. A search pick is saved as a work first (as opening its page would). */
export async function createPost(_prev: PostActionState, formData: FormData): Promise<PostActionState> {
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const user = await getCurrentUser();
  if (!user) return { error: socialErrorMessage({ message: 'not_signed_in' }) };
  const p = parsed.data;

  let workId = p.workId ?? null;
  if (!workId && p.kind && p.externalId) {
    try {
      workId = (await getOrFetchWork(p.kind, p.externalId)).id;
    } catch (e) {
      console.error('[social] createPost work fetch failed', e instanceof Error ? e.message : e);
    }
    if (!workId) return { error: 'Não foi possível abrir essa obra agora. Tente de novo em instantes.' };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('social_posts')
    .insert({ work_id: workId, caption: p.caption, has_spoiler: p.hasSpoiler }).select('id').single();
  if (error) return failed('createPost', error);
  if (user.username) revalidatePath(`/perfil/${user.username}`);
  redirect(`/p/${data.id}`);
}

export async function replyToPost(postId: string, _prev: PostActionState, formData: FormData): Promise<PostActionState> {
  if (!UUID.test(postId)) return { error: SOCIAL_FALLBACK };
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const supabase = await createSessionClient();
  const { error } = await supabase.from('social_replies')
    .insert({ post_id: postId, body: parsed.data.body, has_spoiler: parsed.data.hasSpoiler });
  if (error) return failed('replyToPost', error);
  revalidatePath(`/p/${postId}`);
  return { ok: true };
}

/** Liking twice (two tabs, double click) does nothing the second time. */
export async function likePost(postId: string): Promise<SocialActionState> {
  if (!UUID.test(postId)) return { error: SOCIAL_FALLBACK };
  if (!(await getCurrentUser())) return { error: socialErrorMessage({ message: 'not_signed_in' }) };
  const supabase = await createSessionClient();
  const { error } = await supabase.from('social_likes')
    .upsert({ post_id: postId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
  if (error) return failed('likePost', error);
  return { ok: true };
}

export async function unlikePost(postId: string): Promise<SocialActionState> {
  if (!UUID.test(postId)) return { error: SOCIAL_FALLBACK };
  const user = await getCurrentUser();
  if (!user) return { error: socialErrorMessage({ message: 'not_signed_in' }) };
  const supabase = await createSessionClient();
  const { error } = await supabase.from('social_likes').delete().eq('post_id', postId).eq('user_id', user.id);
  if (error) return failed('unlikePost', error);
  return { ok: true };
}

export type WatchTarget = 'post' | 'topic';

/** "Acompanhar" a post or a community topic: new replies show up in the bell and in the timeline. */
export async function watch(target: WatchTarget, id: string, path: string): Promise<SocialActionState> {
  if (!UUID.test(id)) return { error: SOCIAL_FALLBACK };
  if (!(await getCurrentUser())) return { error: socialErrorMessage({ message: 'not_signed_in' }) };
  const supabase = await createSessionClient();
  const { error } = await supabase.from('watches').insert(target === 'post' ? { social_post_id: id } : { topic_id: id });
  // Already following (two tabs): fine.
  if (error && error.code !== '23505') return failed('watch', error);
  if (isLocalPath(path)) revalidatePath(path);
  return { ok: true };
}

export async function unwatch(target: WatchTarget, id: string, path: string): Promise<SocialActionState> {
  if (!UUID.test(id)) return { error: SOCIAL_FALLBACK };
  const user = await getCurrentUser();
  if (!user) return { error: socialErrorMessage({ message: 'not_signed_in' }) };
  const supabase = await createSessionClient();
  const { error } = await supabase.from('watches').delete().eq('user_id', user.id).eq(target === 'post' ? 'social_post_id' : 'topic_id', id);
  if (error) return failed('unwatch', error);
  if (isLocalPath(path)) revalidatePath(path);
  return { ok: true };
}

/** The author (or an admin) removes a post; then goes back to their profile. */
export async function deletePost(postId: string): Promise<SocialActionState> {
  if (!UUID.test(postId)) return { error: SOCIAL_FALLBACK };
  const user = await getCurrentUser();
  if (!user) return { error: socialErrorMessage({ message: 'not_signed_in' }) };
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc('delete_social_post', { p_id: postId });
  if (error) return failed('deletePost', error);
  revalidatePath(`/p/${postId}`);
  redirect(user.username ? `/@${user.username}` : '/');
}

export async function deleteReply(replyId: string, postId: string): Promise<SocialActionState> {
  if (!UUID.test(replyId) || !UUID.test(postId)) return { error: SOCIAL_FALLBACK };
  if (!(await getCurrentUser())) return { error: socialErrorMessage({ message: 'not_signed_in' }) };
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc('delete_social_reply', { p_id: replyId });
  if (error) return failed('deleteReply', error);
  revalidatePath(`/p/${postId}`);
  return { ok: true };
}

/** Report a post or a reply to the moderation (once per person). */
export async function reportSocial(_prev: PostActionState, formData: FormData): Promise<PostActionState> {
  const parsed = socialReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Escolha um motivo.' };
  const r = parsed.data;
  const supabase = await createSessionClient();
  // No .select(): reports are readable only by admins.
  const { error } = await supabase.from('reports').insert({
    reason: r.reason, note: r.note ?? null, social_post_id: r.socialPostId ?? null, social_reply_id: r.socialReplyId ?? null,
  });
  if (error) return failed('reportSocial', error);
  return { ok: true };
}

/** Catalog search for the post composer's work picker. */
export async function searchWorks(query: string): Promise<{ hits: SearchHit[]; error?: string }> {
  if (typeof query !== 'string' || query.length > 100) return { hits: [] };
  const { hits, unavailable } = await searchCatalog(query);
  return { hits: hits.slice(0, 12), error: hits.length === 0 && unavailable.length > 0 ? 'A busca está indisponível agora. Tente de novo em instantes.' : undefined };
}
