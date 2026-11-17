import { getJson, type FetchImpl } from '@/lib/catalog/http';
import { BOOKS_REVALIDATE_S, cachedFetch, openLibraryRecent, todaySaoPaulo, type ReleaseItem } from '@/lib/home/releases';
import { MAX_PAGE, type ExploreFilter } from './options';
import type { Page } from './tmdb';

/** Explorar shelves for books, live from Open Library (no key, no daily limit), cached 12 h. */
const OL_SEARCH = 'https://openlibrary.org/search.json';
const OL_HEADERS = { 'User-Agent': 'Lobby/0.1 (catalog)', Accept: 'application/json' };
const FIELDS = 'key,title,cover_i';
const PER_PAGE = 24;
const TRENDING_YEARS = 2;
/** Open Library often takes ~10 s on a cold list; these pages stream, so they can wait longer than search. */
const LIST_TIMEOUT_MS = 15_000;

/** Books have no "Mais recentes" (Open Library's "new" brings mostly works without a cover). */
const SORT = { populares: 'readinglog', avaliados: 'rating' } as const;
const defaultFetch = () => cachedFetch(BOOKS_REVALIDATE_S);

async function search(params: Record<string, string>, fetchImpl: FetchImpl): Promise<unknown> {
  return getJson(`${OL_SEARCH}?${new URLSearchParams({ ...params, fields: FIELDS })}`, 'books', OL_HEADERS, fetchImpl,
    { timeoutMs: LIST_TIMEOUT_MS });
}

function unique(items: ReleaseItem[]): ReleaseItem[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.externalId) ? false : (seen.add(i.externalId), true)));
}

/** Portuguese fiction first published in the last couple of years (cheap for Open Library to answer). */
function recentFiction(today: string): string {
  const year = Number(today.slice(0, 4));
  return `language:por subject:fiction first_publish_year:[${year - TRENDING_YEARS} TO ${year}]`;
}

/** "Em alta": recent Portuguese fiction, most read first. */
export async function olTrendingPt(fetchImpl: FetchImpl = defaultFetch(), today: string = todaySaoPaulo()): Promise<ReleaseItem[]> {
  const json = await search({ q: recentFiction(today), sort: 'readinglog', limit: '40' }, fetchImpl);
  return unique(openLibraryRecent(json));
}

/**
 * "Ver mais" of books: one subject in Portuguese (or, without a subject, the same recent fiction as "Em alta"),
 * pages 1 to `filter.page` in one request.
 */
export async function olSubject(
  subject: string | undefined, filter: ExploreFilter, fetchImpl: FetchImpl = defaultFetch(), today: string = todaySaoPaulo(),
): Promise<Page> {
  const q = subject ? `subject:${subject} language:por` : recentFiction(today);
  const limit = PER_PAGE * filter.page;
  const sort = filter.sort === 'avaliados' ? SORT.avaliados : SORT.populares;
  const json = await search({ q, sort, limit: String(limit), page: '1' }, fetchImpl);
  const found = (json as { numFound?: unknown })?.numFound;
  const docs = (json as { docs?: unknown })?.docs;
  // Where the page just loaded starts: the covers that the earlier pages' answers really produced.
  const earlier = Array.isArray(docs) ? unique(openLibraryRecent({ docs: docs.slice(0, PER_PAGE * (filter.page - 1)) })).length : 0;
  return {
    items: unique(openLibraryRecent(json)),
    hasMore: typeof found === 'number' && found > limit && filter.page < MAX_PAGE,
    newFrom: earlier,
  };
}
