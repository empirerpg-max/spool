import 'server-only';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import type { AlertItem } from '@/components/alerts/AlertList';
import { workPath } from '@/lib/catalog/kind';
import type { WorkKind } from '@/lib/catalog/types';
import type { ActivityKind, ActivityRow } from '@/lib/social/group-activity';

export async function unreadCount(): Promise<number> {
  if (!supabaseConfigured()) return 0;
  const supabase = await createSessionClient();
  const { data } = await supabase.rpc('unread_count');
  return typeof data === 'number' ? data : 0;
}

type Row = { id: number; read_at: string | null; created_at: string; event: { title: string; url: string } | Array<{ title: string; url: string }> };

export async function listMyAlerts(limit = 100): Promise<AlertItem[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('notifications')
    .select('id, read_at, created_at, event:events(title, url)').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const e = Array.isArray(r.event) ? r.event[0] : r.event;
    return { id: r.id, title: e?.title ?? 'Aviso', url: e?.url ?? '/', createdAt: r.created_at, unread: r.read_at === null };
  });
}

type One<T> = T | T[] | null;
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
type ActivityDbRow = {
  id: number; kind: ActivityKind; created_at: string; read_at: string | null;
  actor: One<{ username: string | null }>;
  post: One<{ id: string; work: One<{ title: string }> }>;
  topic: One<{ id: string; title: string; work: One<{ kind: WorkKind; external_id: string }> }>;
};

const RECENT_DAYS = 30;

/** Social alerts (follows, likes, replies, followed conversations): all unread plus the last 30 days. */
export async function listMyActivity(limit = 200): Promise<ActivityRow[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createSessionClient();
  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase.from('activity')
    .select('id, kind, created_at, read_at, actor:profiles!activity_actor_id_fkey(username), post:social_posts(id, work:works(title)), topic:topics(id, title, work:works(kind, external_id))')
    .or(`read_at.is.null,created_at.gt.${since}`)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return ((data ?? []) as unknown as ActivityDbRow[]).map((r) => {
    const post = one(r.post);
    const topic = one(r.topic);
    const topicWork = one(topic?.work ?? null);
    return {
      id: r.id, kind: r.kind, actor: one(r.actor)?.username ?? null, createdAt: r.created_at, unread: r.read_at === null,
      post: post ? { id: post.id, workTitle: one(post.work)?.title ?? 'uma obra' } : null,
      topic: topic && topicWork ? { id: topic.id, title: topic.title, href: `${workPath(topicWork.kind, topicWork.external_id)}/topicos/${topic.id}` } : null,
    };
  });
}

/** Marks list alerts and social alerts as read. */
export async function markAllRead(): Promise<void> {
  if (!supabaseConfigured()) return;
  const supabase = await createSessionClient();
  await Promise.all([supabase.rpc('mark_notifications_read'), supabase.rpc('mark_activity_read')]);
}
