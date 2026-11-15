import 'server-only';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';

export type TopicSummary = {
  id: string;
  title: string;
  hasSpoiler: boolean;
  spoilerSeason: number | null;
  spoilerEpisode: number | null;
  replyCount: number;
  lastActivityAt: string;
  author: string;
};
export type TopicDetail = TopicSummary & { body: string; workId: string; createdAt: string };
export type Reply = { id: string; body: string; hasSpoiler: boolean; createdAt: string; author: string };

const TOPICS_PER_PAGE = 20;
const REPLIES_PER_PAGE = 50;

type AuthorJoin = { username: string | null } | Array<{ username: string | null }> | null;
const authorName = (a: AuthorJoin) => (Array.isArray(a) ? a[0]?.username : a?.username) ?? 'removido';

type TopicRow = {
  id: string; title: string; has_spoiler: boolean; spoiler_season: number | null; spoiler_episode: number | null;
  reply_count: number; last_activity_at: string; author: AuthorJoin;
};
const TOPIC_COLUMNS = 'id, title, has_spoiler, spoiler_season, spoiler_episode, reply_count, last_activity_at, author:profiles!topics_author_id_fkey(username)';

function toSummary(r: TopicRow): TopicSummary {
  return {
    id: r.id, title: r.title, hasSpoiler: r.has_spoiler, spoilerSeason: r.spoiler_season, spoilerEpisode: r.spoiler_episode,
    replyCount: r.reply_count, lastActivityAt: r.last_activity_at, author: authorName(r.author),
  };
}

const pageRange = (page: number, size: number) => {
  const from = (Math.max(1, Math.floor(page)) - 1) * size;
  return [from, from + size] as const; // one extra row tells us whether there is a next page
};

export async function listTopics(workId: string, page = 1): Promise<{ topics: TopicSummary[]; hasMore: boolean }> {
  if (!supabaseConfigured()) return { topics: [], hasMore: false };
  const supabase = await createSessionClient();
  const [from, to] = pageRange(page, TOPICS_PER_PAGE);
  const { data, error } = await supabase.from('topics').select(TOPIC_COLUMNS).eq('work_id', workId)
    .order('last_activity_at', { ascending: false }).range(from, to);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const rows = (data ?? []) as unknown as TopicRow[];
  return { topics: rows.slice(0, TOPICS_PER_PAGE).map(toSummary), hasMore: rows.length > TOPICS_PER_PAGE };
}

export async function getTopicWithReplies(
  topicId: string,
  page = 1,
): Promise<{ topic: TopicDetail; replies: Reply[]; hasMore: boolean } | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createSessionClient();
  const { data: t, error } = await supabase.from('topics').select(`${TOPIC_COLUMNS}, body, work_id, created_at`).eq('id', topicId).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!t) return null;
  const row = t as unknown as TopicRow & { body: string; work_id: string; created_at: string };

  const [from, to] = pageRange(page, REPLIES_PER_PAGE);
  const { data: posts, error: pErr } = await supabase.from('posts')
    .select('id, body, has_spoiler, created_at, author:profiles!posts_author_id_fkey(username)')
    .eq('topic_id', topicId).order('created_at', { ascending: true }).range(from, to);
  if (pErr) throw new Error(`Supabase: ${pErr.message}`);
  const replies = ((posts ?? []) as unknown as Array<{ id: string; body: string; has_spoiler: boolean; created_at: string; author: AuthorJoin }>)
    .map((p) => ({ id: p.id, body: p.body, hasSpoiler: p.has_spoiler, createdAt: p.created_at, author: authorName(p.author) }));

  return {
    topic: { ...toSummary(row), body: row.body, workId: row.work_id, createdAt: row.created_at },
    replies: replies.slice(0, REPLIES_PER_PAGE),
    hasMore: replies.length > REPLIES_PER_PAGE,
  };
}
