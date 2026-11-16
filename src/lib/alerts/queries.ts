import 'server-only';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import type { AlertItem } from '@/components/alerts/AlertList';

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

export async function markAllRead(): Promise<void> {
  if (!supabaseConfigured()) return;
  const supabase = await createSessionClient();
  await supabase.rpc('mark_notifications_read');
}
