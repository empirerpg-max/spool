import 'server-only';
import type { CatalogData } from '@/components/explore/ExploreCatalog';
import { settle, type ReleaseItem } from '@/lib/home/releases';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import { suggestedPeople } from '@/lib/social/timeline';
import type { PersonWithFollow } from '@/lib/social/queries';
import { olTrendingPt } from './books';
import type { ExploreKind } from './options';
import { tmdbTopRated, tmdbTrending } from './tmdb';

const LOBBY_SIZE = 20;
const PEOPLE_SIZE = 6;

type LobbyRow = { kind: ExploreKind; external_id: string; title: string; poster_url: string | null; members: number };

/** "Populares no Lobby" (members only): works most members added to their lists in the last 30 days. */
export async function lobbyPopular(kind: ExploreKind): Promise<ReleaseItem[]> {
  if (!supabaseConfigured()) return [];
  const db = await createSessionClient();
  const { data, error } = await db.rpc('lobby_popular', { p_kind: kind, p_limit: LOBBY_SIZE });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return ((data ?? []) as LobbyRow[]).map((r) => ({
    kind: r.kind, externalId: r.external_id, title: r.title, posterUrl: r.poster_url, date: null, popularity: r.members,
  }));
}

/** Members who are active and not yet followed, as people with a follow button. */
export async function peopleToFollow(limit = PEOPLE_SIZE): Promise<PersonWithFollow[]> {
  return (await suggestedPeople(limit)).map((p) => ({
    id: p.id, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, isMe: false, isFollowing: false,
  }));
}

/**
 * Every shelf of one kind, each one still loading: the page shows at once and each shelf streams in when its
 * source answers (Open Library can take 10 s). Each fails on its own. Member-only shelves are null for visitors.
 */
export function loadCatalog(kind: ExploreKind, member: boolean): CatalogData {
  const screen = kind === 'book' ? null : kind;
  return {
    kind,
    trending: settle('explore trending', screen ? tmdbTrending(screen) : olTrendingPt()),
    topRated: screen ? settle('explore top rated', tmdbTopRated(screen)) : null,
    lobby: member ? settle('explore lobby popular', lobbyPopular(kind)) : null,
    people: member ? settle('explore people', peopleToFollow()) : null,
  };
}
