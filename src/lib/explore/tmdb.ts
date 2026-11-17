import type { FetchImpl } from '@/lib/catalog/http';
import { fetchTmdbList } from '@/lib/catalog/tmdb-client';
import { addDays, cachedFetch, RELEASES_REVALIDATE_S, tmdbItems, todaySaoPaulo, type ReleaseItem } from '@/lib/home/releases';
import { MAX_PAGE, type ExploreFilter } from './options';

/**
 * Explorar shelves for films and series, live from TMDB and kept only in the fetch cache (6 h).
 * Nothing is written to the database.
 */
type Screen = 'movie' | 'series';
/** A "ver mais" list: pages 1 to N. `newFrom` = index of the first item of page N (what earlier pages really showed). */
export type Page = { items: ReleaseItem[]; hasMore: boolean; newFrom: number };

/** Which cover "Carregar mais" scrolls to: the first new one (or the last, if the new page brought nothing). */
export function moreAnchor(page: number, result: Page): number | undefined {
  if (page <= 1 || result.items.length === 0) return undefined;
  return Math.min(result.newFrom, result.items.length - 1);
}

/**
 * Enough votes that fans can't put a title on top, and only titles out for 6 months:
 * in the first weeks fan votes inflate the average (a new anime film opening at 9+, IMDb 5.5).
 */
const MIN_VOTES_RATED = { movie: 1000, series: 500 } as const;
const RATED_SETTLE_DAYS = 180;
const MIN_VOTES_RECENT = 10;

const tv = (kind: Screen) => (kind === 'movie' ? 'movie' : 'tv');
const defaultFetch = () => cachedFetch(RELEASES_REVALIDATE_S);

export async function tmdbTrending(kind: Screen, fetchImpl: FetchImpl = defaultFetch()): Promise<ReleaseItem[]> {
  return tmdbItems(await fetchTmdbList(`/trending/${tv(kind)}/week`, {}, fetchImpl), kind);
}

export async function tmdbTopRated(kind: Screen, fetchImpl: FetchImpl = defaultFetch()): Promise<ReleaseItem[]> {
  return (await tmdbDiscover(kind, { sort: 'avaliados', page: 1 }, fetchImpl)).items;
}

/** Query of TMDB's "discover" for a filter. */
function discoverParams(kind: Screen, f: ExploreFilter, today: string, page: number): Record<string, string> {
  const p: Record<string, string> = { include_adult: 'false', page: String(page) };
  if (f.sort === 'avaliados') {
    const date = kind === 'movie' ? 'primary_release_date' : 'first_air_date';
    p.sort_by = 'vote_average.desc';
    p['vote_count.gte'] = String(MIN_VOTES_RATED[kind]);
    p[`${date}.lte`] = addDays(today, -RATED_SETTLE_DAYS);
  } else if (f.sort === 'recentes') {
    const date = kind === 'movie' ? 'primary_release_date' : 'first_air_date';
    p.sort_by = `${date}.desc`;
    p[`${date}.lte`] = today;
    p['vote_count.gte'] = String(MIN_VOTES_RECENT);
  } else {
    p.sort_by = 'popularity.desc';
  }
  if (f.genre !== undefined) p.with_genres = String(f.genre);
  if (f.provider !== undefined) {
    p.with_watch_providers = String(f.provider);
    p.watch_region = 'BR';
    p.with_watch_monetization_types = 'flatrate';
  }
  return p;
}

const totalPages = (json: unknown) => {
  const n = (json as { total_pages?: unknown })?.total_pages;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

/**
 * "Ver mais": pages 1 to `filter.page` (each cached on its own), without repeats.
 * Fails only when the first page fails; a later page failing just ends the list there.
 */
export async function tmdbDiscover(
  kind: Screen, filter: ExploreFilter, fetchImpl: FetchImpl = defaultFetch(), today: string = todaySaoPaulo(),
): Promise<Page> {
  const path = `/discover/${tv(kind)}`;
  const pages = Array.from({ length: filter.page }, (_, i) => i + 1);
  const answers = await Promise.allSettled(pages.map((n) => fetchTmdbList(path, discoverParams(kind, filter, today, n), fetchImpl)));
  if (answers[0].status === 'rejected') throw answers[0].reason;

  const seen = new Set<string>();
  const items: ReleaseItem[] = [];
  let complete = true;
  let total = 0;
  let newFrom = 0;
  for (const [n, a] of answers.entries()) {
    if (a.status === 'rejected') { complete = false; break; }
    if (n === answers.length - 1) newFrom = items.length;
    total = totalPages(a.value);
    for (const i of tmdbItems(a.value, kind)) {
      if (!seen.has(i.externalId)) { seen.add(i.externalId); items.push(i); }
    }
  }
  return { items, hasMore: complete && filter.page < Math.min(total, MAX_PAGE), newFrom: complete ? newFrom : items.length };
}
