import 'server-only';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import type { WorkKind } from '@/lib/catalog/types';
import { listMyItems } from '@/lib/list/queries';
import type { ListStatus } from '@/lib/list/types';

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

/** Everything a profile page needs about a person and how the viewer relates to them. */
export type ProfileView = PersonSummary & {
  bio: string | null;
  listPublic: boolean;
  followers: number;
  following: number;
  posts: number;
  isMe: boolean;
  isFollowing: boolean;
  /** The viewer blocked this person (the page shows only "Você bloqueou" + Desbloquear). */
  iBlocked: boolean;
  iMuted: boolean;
};

const USERNAME = /^[a-z0-9_]{3,20}$/;
const PEOPLE_PER_PAGE = 50;

async function viewerId(supabase: Awaited<ReturnType<typeof createSessionClient>>): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * A profile as seen by the signed-in viewer. Null when it doesn't exist, the viewer is signed out,
 * or the person blocked the viewer. When the viewer blocked the person, iBlocked is true and the page shows little.
 */
export async function getProfileByUsername(username: string): Promise<ProfileView | null> {
  const handle = username.trim().toLowerCase();
  if (!USERNAME.test(handle) || !supabaseConfigured()) return null;
  const supabase = await createSessionClient();
  const me = await viewerId(supabase);
  if (!me) return null;

  const { data: p, error } = await supabase.from('profiles')
    .select('id, username, display_name, bio, avatar_url, list_public').eq('username', handle).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!p || !p.username) return null;
  const isMe = p.id === me;

  const head = { count: 'exact' as const, head: true };
  const [blockedEither, iBlocked, iMuted, isFollowing, followers, following, posts] = await Promise.all([
    isMe ? Promise.resolve({ data: false, error: null }) : supabase.rpc('is_blocked', { a: me, b: p.id }),
    isMe ? Promise.resolve({ count: 0, error: null }) : supabase.from('blocks').select('blocked_id', head).eq('blocker_id', me).eq('blocked_id', p.id),
    isMe ? Promise.resolve({ count: 0, error: null }) : supabase.from('mutes').select('muted_id', head).eq('muter_id', me).eq('muted_id', p.id),
    isMe ? Promise.resolve({ count: 0, error: null }) : supabase.from('follows').select('followee_id', head).eq('follower_id', me).eq('followee_id', p.id),
    supabase.from('follows').select('follower_id', head).eq('followee_id', p.id),
    supabase.from('follows').select('followee_id', head).eq('follower_id', p.id),
    supabase.from('social_posts').select('id', head).eq('author_id', p.id),
  ]);
  for (const r of [blockedEither, iBlocked, iMuted, isFollowing, followers, following, posts]) {
    if (r.error) throw new Error(`Supabase: ${r.error.message}`);
  }
  const blockedByMe = (iBlocked.count ?? 0) > 0;
  if (blockedEither.data === true && !blockedByMe) return null; // they blocked the viewer: the profile "doesn't exist"

  return {
    id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url, bio: p.bio, listPublic: p.list_public,
    followers: followers.count ?? 0, following: following.count ?? 0, posts: posts.count ?? 0,
    isMe, isFollowing: (isFollowing.count ?? 0) > 0, iBlocked: blockedByMe, iMuted: (iMuted.count ?? 0) > 0,
  };
}

export type PersonWithFollow = PersonSummary & { isMe: boolean; isFollowing: boolean };

async function listPeople(profileId: string, side: 'followers' | 'following', page: number): Promise<{ people: PersonWithFollow[]; hasMore: boolean }> {
  if (!supabaseConfigured()) return { people: [], hasMore: false };
  const supabase = await createSessionClient();
  const me = await viewerId(supabase);
  if (!me) return { people: [], hasMore: false };
  const from = (Math.max(1, Math.floor(page)) - 1) * PEOPLE_PER_PAGE;
  // Followers of X: rows where X is followed, showing the follower; following: the other way round.
  const [matchCol, fk] = side === 'followers'
    ? ['followee_id', 'follows_follower_id_fkey'] as const
    : ['follower_id', 'follows_followee_id_fkey'] as const;
  const { data, error } = await supabase.from('follows').select(`created_at, person:profiles!${fk}(${PERSON})`)
    .eq(matchCol, profileId).order('created_at', { ascending: false }).range(from, from + PEOPLE_PER_PAGE);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const rows = ((data ?? []) as unknown as Array<{ person: ProfileJoin | ProfileJoin[] | null }>)
    .map((r) => toPerson(one(r.person))).filter((p): p is PersonSummary => p !== null);
  const pageRows = rows.slice(0, PEOPLE_PER_PAGE);

  const others = pageRows.map((p) => p.id).filter((id) => id !== me);
  let mine = new Set<string>();
  if (others.length > 0) {
    const { data: f, error: fErr } = await supabase.from('follows').select('followee_id').eq('follower_id', me).in('followee_id', others);
    if (fErr) throw new Error(`Supabase: ${fErr.message}`);
    mine = new Set((f ?? []).map((r) => r.followee_id as string));
  }
  return {
    people: pageRows.map((p) => ({ ...p, isMe: p.id === me, isFollowing: mine.has(p.id) })),
    hasMore: data !== null && data.length > PEOPLE_PER_PAGE,
  };
}

/** People who follow the profile, newest first, 50 per page. */
export const listFollowers = (profileId: string, page = 1) => listPeople(profileId, 'followers', page);
/** People the profile follows, newest first, 50 per page. */
export const listFollowing = (profileId: string, page = 1) => listPeople(profileId, 'following', page);

export type WorkSummary = { kind: WorkKind; externalId: string; title: string; posterUrl: string | null; year: number | null };
type WorkRow = { id?: string; kind: WorkKind; external_id: string; title: string; poster_url: string | null; release_date_br: string | null };
const WORK = 'kind, external_id, title, poster_url, release_date_br';
const toWork = (w: WorkRow): WorkSummary => ({
  kind: w.kind, externalId: w.external_id, title: w.title, posterUrl: w.poster_url,
  year: w.release_date_br ? Number(w.release_date_br.slice(0, 4)) : null,
});

export type ProfileReview = { topicId: string; title: string; hasSpoiler: boolean; replyCount: number; createdAt: string; work: WorkSummary };

// Published reviews are community topics opened by publish_review with this title.
const REVIEW_TITLE_PREFIX = 'Resenha de @';

/** Reviews this person published in the communities (removed ones are hidden by the database rules). */
export async function listProfileReviews(profileId: string): Promise<ProfileReview[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('topics')
    .select(`id, title, has_spoiler, reply_count, created_at, work:works!inner(${WORK})`)
    .eq('author_id', profileId).like('title', `${REVIEW_TITLE_PREFIX}%`)
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return ((data ?? []) as unknown as Array<{ id: string; title: string; has_spoiler: boolean; reply_count: number; created_at: string; work: WorkRow | WorkRow[] }>)
    .map((r) => ({
      topicId: r.id, title: r.title, hasSpoiler: r.has_spoiler, replyCount: r.reply_count, createdAt: r.created_at,
      work: toWork(one(r.work) as WorkRow),
    }));
}

export type PublicListEntry = { workId: string; status: ListStatus; work: WorkSummary };

/**
 * The works and states of a person's list — never stars or reviews. Someone else's list comes back only
 * when they made it public (and nobody blocked anyone); your own always comes back.
 */
export async function listProfileList(username: string, isMe: boolean): Promise<PublicListEntry[]> {
  if (!supabaseConfigured()) return [];
  if (isMe) return (await listMyItems()).map((e) => ({ workId: e.workId, status: e.status, work: e.work }));
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc('public_list', { p_username: username });
  if (error) throw new Error(`Supabase: ${error.message}`);
  const items = ((data ?? []) as Array<{ work_id: string; status: ListStatus }>).slice(0, 500);
  if (items.length === 0) return [];
  // Small batches keep the request address short.
  const ids = items.map((i) => i.work_id);
  const batches = await Promise.all(Array.from({ length: Math.ceil(ids.length / 100) }, (_, k) =>
    supabase.from('works').select(`id, ${WORK}`).in('id', ids.slice(k * 100, k * 100 + 100))));
  const byId = new Map<string, WorkSummary>();
  for (const b of batches) {
    if (b.error) throw new Error(`Supabase: ${b.error.message}`);
    for (const w of (b.data ?? []) as WorkRow[]) byId.set(w.id as string, toWork(w));
  }
  return items.flatMap((i) => {
    const work = byId.get(i.work_id);
    return work ? [{ workId: i.work_id, status: i.status, work }] : [];
  });
}
