import 'server-only';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import { workPath } from '@/lib/catalog/kind';
import type { TimelineCursor } from './cursor';
import { getPostsByIds } from './post-queries';
import { one, PERSON, toPerson, toWork, WORK, type ProfileJoin, type WorkRow } from './queries';
import type { ActiveCommunity, Person, SuggestedPerson, TimelineEntry } from './types';

export const TIMELINE_PAGE = 20;
type Row = {
  item_type: 'post' | 'review' | 'reply'; item_id: string; created_at: string; actor_id: string;
  work_id: string; social_post_id: string | null; topic_id: string | null;
};

type Db = Awaited<ReturnType<typeof createSessionClient>>;

async function byIds<T extends { id: string }>(db: Db, table: string, columns: string, ids: string[]): Promise<Map<string, T>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db.from(table).select(columns).in('id', [...new Set(ids)]);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return new Map(((data ?? []) as unknown as T[]).map((r) => [r.id, r]));
}

/**
 * One page of the signed-in member's timeline: posts and reviews by people they follow and new replies
 * in conversations they follow. `next` is the cursor for "Carregar mais" (null when there is no more).
 */
export async function loadTimeline(before: TimelineCursor | null): Promise<{ entries: TimelineEntry[]; next: TimelineCursor | null }> {
  if (!supabaseConfigured()) return { entries: [], next: null };
  const db = await createSessionClient();
  const { data, error } = await db.rpc('timeline', { p_before: before?.at ?? null, p_before_id: before?.id ?? null, p_limit: TIMELINE_PAGE });
  if (error) throw new Error(`Supabase: ${error.message}`);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return { entries: [], next: null };

  const ids = (type: Row['item_type'], filter: (r: Row) => boolean = () => true) =>
    rows.filter((r) => r.item_type === type && filter(r)).map((r) => r.item_id);
  const socialReplyIds = ids('reply', (r) => r.social_post_id !== null);
  const topicReplyIds = ids('reply', (r) => r.topic_id !== null);

  type TopicRow = { id: string; title: string; has_spoiler: boolean; work: WorkRow | WorkRow[] | null };
  type SReply = { id: string; body: string; has_spoiler: boolean; post: { id: string; work: WorkRow | WorkRow[] | null } | Array<{ id: string; work: WorkRow | WorkRow[] | null }> | null };
  type CReply = { id: string; body: string; has_spoiler: boolean; topic: TopicRow | TopicRow[] | null };

  const [posts, people, reviews, sReplies, cReplies] = await Promise.all([
    getPostsByIds(ids('post')),
    byIds<ProfileJoin>(db, 'profiles', PERSON, rows.map((r) => r.actor_id)),
    byIds<TopicRow>(db, 'topics', `id, title, has_spoiler, work:works(${WORK})`, ids('review')),
    byIds<SReply>(db, 'social_replies', `id, body, has_spoiler, post:social_posts(id, work:works(${WORK}))`, socialReplyIds),
    byIds<CReply>(db, 'posts', `id, body, has_spoiler, topic:topics(id, title, has_spoiler, work:works(${WORK}))`, topicReplyIds),
  ]);
  const postsById = new Map(posts.map((p) => [p.id, p]));

  const entries = rows.flatMap((r): TimelineEntry[] => {
    const key = `${r.item_type}:${r.item_id}`;
    if (r.item_type === 'post') {
      const post = postsById.get(r.item_id);
      return post ? [{ type: 'post', key, createdAt: r.created_at, post }] : [];
    }
    const actor: Person | null = toPerson(people.get(r.actor_id) ?? null);
    if (!actor) return [];
    if (r.item_type === 'review') {
      const t = reviews.get(r.item_id);
      const w = t ? one(t.work) : null;
      if (!t || !w) return [];
      const work = toWork(w);
      return [{ type: 'review', key, createdAt: r.created_at, actor, work, href: `${workPath(work.kind, work.externalId)}/topicos/${t.id}`, hasSpoiler: t.has_spoiler }];
    }
    if (r.social_post_id) {
      const reply = sReplies.get(r.item_id);
      const post = reply ? one(reply.post) : null;
      const w = post ? one(post.work) : null;
      if (!reply || !post || !w) return [];
      return [{ type: 'reply', key, createdAt: r.created_at, actor, conversation: `publicação sobre ${w.title}`, href: `/p/${post.id}`, body: reply.body, hasSpoiler: reply.has_spoiler }];
    }
    const reply = cReplies.get(r.item_id);
    const topic = reply ? one(reply.topic) : null;
    const w = topic ? one(topic.work) : null;
    if (!reply || !topic || !w) return [];
    return [{
      type: 'reply', key, createdAt: r.created_at, actor, conversation: topic.title,
      href: `${workPath(w.kind, w.external_id)}/topicos/${topic.id}`, body: reply.body, hasSpoiler: reply.has_spoiler || topic.has_spoiler,
    }];
  });

  const last = rows[rows.length - 1];
  return { entries, next: rows.length === TIMELINE_PAGE ? { at: last.created_at, id: last.item_id } : null };
}

/** Active members the viewer does not follow yet (no blocked, muted or banned people). */
export async function suggestedPeople(limit = 8): Promise<SuggestedPerson[]> {
  if (!supabaseConfigured()) return [];
  const db = await createSessionClient();
  const { data, error } = await db.rpc('suggested_people', { p_limit: limit });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return ((data ?? []) as Array<ProfileJoin & { recent_posts: number }>).flatMap((p) => {
    const person = toPerson(p);
    return person ? [{ ...person, recentPosts: p.recent_posts }] : [];
  });
}

/** Works with the most new topics and posts in the last 7 days. */
export async function activeCommunities(limit = 6): Promise<ActiveCommunity[]> {
  if (!supabaseConfigured()) return [];
  const db = await createSessionClient();
  const { data, error } = await db.rpc('active_communities', { p_limit: limit });
  if (error) throw new Error(`Supabase: ${error.message}`);
  const rows = (data ?? []) as Array<{ work_id: string; topics: number; posts: number }>;
  const works = await byIds<WorkRow & { id: string }>(db, 'works', `id, ${WORK}`, rows.map((r) => r.work_id));
  return rows.flatMap((r) => {
    const w = works.get(r.work_id);
    return w ? [{ work: toWork(w), topics: r.topics, posts: r.posts }] : [];
  });
}

/** Suggestions for an empty timeline. They never break the page: without them it still shows the empty-state text. */
export async function timelineSuggestions(): Promise<{ people: SuggestedPerson[]; communities: ActiveCommunity[] }> {
  const [people, communities] = await Promise.all([
    suggestedPeople().catch((e) => { console.error('[social] suggestions failed', e); return []; }),
    activeCommunities().catch((e) => { console.error('[social] active communities failed', e); return []; }),
  ]);
  return { people, communities };
}
