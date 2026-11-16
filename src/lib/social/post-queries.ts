import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import { one, PERSON, toPerson, toWork, WORK, type ProfileJoin, type WorkRow } from './queries';
import type { SocialPost, SocialReply } from './types';

export const POSTS_PER_PAGE = 20;
const REPLIES_PER_PAGE = 50;

const POST_COLUMNS = `id, caption, has_spoiler, like_count, reply_count, created_at,
  author:profiles!social_posts_author_id_fkey(${PERSON}), work:works!inner(id, ${WORK})`;

type PostRow = {
  id: string; caption: string; has_spoiler: boolean; like_count: number; reply_count: number; created_at: string;
  author: ProfileJoin | ProfileJoin[] | null; work: WorkRow | WorkRow[];
};

const pageRange = (page: number, size: number) => {
  const from = (Math.max(1, Math.floor(page)) - 1) * size;
  return [from, from + size] as const; // one extra row tells whether there is a next page
};

async function viewer(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Rows → cards, with "liked by me" filled in one extra query. Posts whose author has no @ are skipped. */
async function hydrate(supabase: SupabaseClient, me: string, rows: PostRow[]): Promise<SocialPost[]> {
  if (rows.length === 0) return [];
  const { data: likes, error } = await supabase.from('social_likes').select('post_id').eq('user_id', me).in('post_id', rows.map((r) => r.id));
  if (error) throw new Error(`Supabase: ${error.message}`);
  const liked = new Set((likes ?? []).map((l) => l.post_id as string));
  return rows.flatMap((r) => {
    const author = toPerson(one(r.author));
    const w = one(r.work);
    if (!author || !w) return [];
    return [{
      id: r.id, author, work: { id: w.id as string, ...toWork(w) }, caption: r.caption, hasSpoiler: r.has_spoiler,
      likeCount: r.like_count, replyCount: r.reply_count, createdAt: r.created_at, likedByMe: liked.has(r.id), isMine: author.id === me,
    }];
  });
}

/** One post as the signed-in viewer sees it, plus whether they follow the conversation. Null when hidden, removed or blocked. */
export async function getPost(id: string): Promise<(SocialPost & { watching: boolean }) | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createSessionClient();
  const me = await viewer(supabase);
  if (!me) return null;
  const { data, error } = await supabase.from('social_posts').select(POST_COLUMNS).eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!data) return null;
  const [post] = await hydrate(supabase, me, [data as unknown as PostRow]);
  if (!post) return null;
  const { count, error: wErr } = await supabase.from('watches').select('id', { count: 'exact', head: true }).eq('user_id', me).eq('social_post_id', id);
  if (wErr) throw new Error(`Supabase: ${wErr.message}`);
  return { ...post, watching: (count ?? 0) > 0 };
}

/** Posts by id (timeline), in the order given; hidden ones are left out. */
export async function getPostsByIds(ids: string[]): Promise<SocialPost[]> {
  if (!supabaseConfigured() || ids.length === 0) return [];
  const supabase = await createSessionClient();
  const me = await viewer(supabase);
  if (!me) return [];
  const { data, error } = await supabase.from('social_posts').select(POST_COLUMNS).in('id', ids).is('deleted_at', null);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const posts = new Map((await hydrate(supabase, me, (data ?? []) as unknown as PostRow[])).map((p) => [p.id, p]));
  return ids.flatMap((id) => posts.get(id) ?? []);
}

async function listPosts(column: 'author_id' | 'work_id', value: string, page: number): Promise<{ posts: SocialPost[]; hasMore: boolean }> {
  if (!supabaseConfigured()) return { posts: [], hasMore: false };
  const supabase = await createSessionClient();
  const me = await viewer(supabase);
  if (!me) return { posts: [], hasMore: false };
  const [from, to] = pageRange(page, POSTS_PER_PAGE);
  const { data, error } = await supabase.from('social_posts').select(POST_COLUMNS).eq(column, value).is('deleted_at', null)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const rows = (data ?? []) as unknown as PostRow[];
  return { posts: await hydrate(supabase, me, rows.slice(0, POSTS_PER_PAGE)), hasMore: rows.length > POSTS_PER_PAGE };
}

/** "Publicações" tab of a profile, newest first. */
export const listPostsByAuthor = (authorId: string, page = 1) => listPosts('author_id', authorId, page);
/** "Publicações" in a work's community, newest first (members only). */
export const listPostsByWork = (workId: string, page = 1) => listPosts('work_id', workId, page);

/** Replies under a post, oldest first, 50 per page. */
export async function listReplies(postId: string, page = 1): Promise<{ replies: SocialReply[]; hasMore: boolean }> {
  if (!supabaseConfigured()) return { replies: [], hasMore: false };
  const supabase = await createSessionClient();
  const me = await viewer(supabase);
  if (!me) return { replies: [], hasMore: false };
  const [from, to] = pageRange(page, REPLIES_PER_PAGE);
  const { data, error } = await supabase.from('social_replies')
    .select(`id, body, has_spoiler, created_at, author:profiles!social_replies_author_id_fkey(${PERSON})`)
    .eq('post_id', postId).is('deleted_at', null).order('created_at', { ascending: true }).range(from, to);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const rows = (data ?? []) as unknown as Array<{ id: string; body: string; has_spoiler: boolean; created_at: string; author: ProfileJoin | ProfileJoin[] | null }>;
  const replies = rows.slice(0, REPLIES_PER_PAGE).flatMap((r) => {
    const author = toPerson(one(r.author));
    return author ? [{ id: r.id, body: r.body, hasSpoiler: r.has_spoiler, createdAt: r.created_at, author, isMine: author.id === me }] : [];
  });
  return { replies, hasMore: rows.length > REPLIES_PER_PAGE };
}

/** Whether the signed-in user follows a community topic. */
export async function isWatchingTopic(topicId: string): Promise<boolean> {
  if (!supabaseConfigured()) return false;
  const supabase = await createSessionClient();
  const me = await viewer(supabase);
  if (!me) return false;
  const { count, error } = await supabase.from('watches').select('id', { count: 'exact', head: true }).eq('user_id', me).eq('topic_id', topicId);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (count ?? 0) > 0;
}


/** A saved work by its internal id (the composer's "?obra="). */
export async function getWorkById(id: string): Promise<SocialPost['work'] | null> {
  if (!supabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('works').select(`id, ${WORK}`).eq('id', id).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!data) return null;
  const w = data as unknown as WorkRow;
  return { id: w.id as string, ...toWork(w) };
}
