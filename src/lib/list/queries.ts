import 'server-only';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import type { WorkKind } from '@/lib/catalog/types';
import type { ListEntry, ListItem, ListStatus } from './types';

type Row = {
  work_id: string; status: ListStatus; rating: string | number | null; review: string | null; review_has_spoiler: boolean;
  finished_on: string | null; review_topic_id: string | null; updated_at: string;
  topic: { deleted_at: string | null } | Array<{ deleted_at: string | null }> | null;
};
// Removed topics are invisible to non-admins (RLS), so a link whose topic doesn't come back was moderated.
const COLUMNS = 'work_id, status, rating, review, review_has_spoiler, finished_on, review_topic_id, updated_at, topic:topics!list_items_review_topic_id_fkey(deleted_at)';

function toItem(r: Row): ListItem {
  const topic = Array.isArray(r.topic) ? r.topic[0] ?? null : r.topic;
  const live = r.review_topic_id !== null && topic !== null && topic.deleted_at === null;
  return {
    workId: r.work_id, status: r.status, rating: r.rating === null ? null : Number(r.rating), review: r.review,
    reviewHasSpoiler: r.review_has_spoiler, finishedOn: r.finished_on, published: live,
    removedByModeration: r.review_topic_id !== null && !live,
    reviewTopicId: r.review_topic_id, updatedAt: r.updated_at,
  };
}

/** The signed-in user's entry for a work (RLS limits rows to the owner). */
export async function getListItem(workId: string): Promise<ListItem | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('list_items').select(COLUMNS).eq('work_id', workId).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data ? toItem(data as Row) : null;
}

type WorkJoin = { kind: WorkKind; external_id: string; title: string; poster_url: string | null; release_date_br: string | null };

export async function listMyItems(filter: { kind?: WorkKind; status?: ListStatus } = {}): Promise<ListEntry[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createSessionClient();
  let q = supabase.from('list_items')
    .select(`${COLUMNS}, work:works!inner(kind, external_id, title, poster_url, release_date_br)`)
    .order('updated_at', { ascending: false }).limit(500);
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.kind) q = q.eq('work.kind', filter.kind);
  const { data, error } = await q;
  if (error) throw new Error(`Supabase: ${error.message}`);
  return ((data ?? []) as unknown as Array<Row & { work: WorkJoin | WorkJoin[] }>).map((r) => {
    const w = Array.isArray(r.work) ? r.work[0] : r.work;
    return {
      ...toItem(r),
      work: { kind: w.kind, externalId: w.external_id, title: w.title, posterUrl: w.poster_url, year: w.release_date_br ? Number(w.release_date_br.slice(0, 4)) : null },
    };
  });
}
