import 'server-only';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import type { PersonWithFollow } from './queries';

type Row = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; i_follow: boolean };

export function toPeople(rows: Row[]): PersonWithFollow[] {
  return rows.flatMap((r) => (r.username
    ? [{ id: r.id, username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url, isMe: false, isFollowing: r.i_follow }]
    : []));
}

/**
 * Members whose @ starts with, or whose profile name contains, the search (accents and capitals ignored).
 * Only for signed-in members; never looks at the private first/last name. People I follow come first.
 */
export async function searchPeople(q: string): Promise<PersonWithFollow[]> {
  if (!supabaseConfigured() || q.trim().length < 2) return [];
  const db = await createSessionClient();
  const { data, error } = await db.rpc('search_people', { p_query: q.trim() });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return toPeople((data ?? []) as Row[]);
}
