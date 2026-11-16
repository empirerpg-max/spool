import 'server-only';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';

/** A person as shown in lists: photo, name and @. */
export type PersonSummary = { id: string; username: string; displayName: string | null; avatarUrl: string | null };

type ProfileJoin = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export const toPerson = (p: ProfileJoin | null): PersonSummary | null =>
  p && p.username ? { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url } : null;

const PERSON = 'id, username, display_name, avatar_url';

/** People the signed-in user blocked and silenced (for "Minha conta"). */
export async function listBlockedAndMuted(): Promise<{ blocked: PersonSummary[]; muted: PersonSummary[] }> {
  if (!supabaseConfigured()) return { blocked: [], muted: [] };
  const supabase = await createSessionClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { blocked: [], muted: [] };
  const [b, m] = await Promise.all([
    supabase.from('blocks').select(`created_at, person:profiles!blocks_blocked_id_fkey(${PERSON})`)
      .eq('blocker_id', auth.user.id).order('created_at', { ascending: false }),
    supabase.from('mutes').select(`created_at, person:profiles!mutes_muted_id_fkey(${PERSON})`)
      .eq('muter_id', auth.user.id).order('created_at', { ascending: false }),
  ]);
  if (b.error) throw new Error(`Supabase: ${b.error.message}`);
  if (m.error) throw new Error(`Supabase: ${m.error.message}`);
  const people = (rows: unknown) =>
    ((rows ?? []) as Array<{ person: ProfileJoin | ProfileJoin[] | null }>).map((r) => toPerson(one(r.person))).filter((p): p is PersonSummary => p !== null);
  return { blocked: people(b.data), muted: people(m.data) };
}

export type OwnProfile = { displayName: string | null; bio: string | null; avatarUrl: string | null; listPublic: boolean };

/** The editable part of the signed-in user's profile. */
export async function getOwnProfile(userId: string): Promise<OwnProfile> {
  const empty: OwnProfile = { displayName: null, bio: null, avatarUrl: null, listPublic: false };
  if (!supabaseConfigured()) return empty;
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('profiles').select('display_name, bio, avatar_url, list_public').eq('id', userId).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!data) return empty;
  return { displayName: data.display_name, bio: data.bio, avatarUrl: data.avatar_url, listPublic: data.list_public };
}
