import { getJson, type FetchImpl } from '@/lib/catalog/http';
import { BOOKS_REVALIDATE_S, cachedFetch, openLibraryRecent, todaySaoPaulo, type ReleaseItem } from '@/lib/home/releases';
import { MAX_PAGE, type ExploreFilter, type ExploreSort } from './options';
import type { Page } from './tmdb';

/** Explorar shelves for books, live from Open Library (no key, no daily limit), cached 12 h. */
const OL_SEARCH = 'https://openlibrary.org/search.json';
const OL_HEADERS = { 'User-Agent': 'Lobby/0.1 (catalog)', Accept: 'application/json' };
const FIELDS = 'key,title,cover_i';
const PER_PAGE = 24;
const TRENDING_YEARS = 2;

const SORT: Record<ExploreSort, string> = { populares: 'readinglog', avaliados: 'rating', recentes: 'new' };
const defaultFetch = () => cachedFetch(BOOKS_REVALIDATE_S);

async function search(params: Record<string, string>, fetchImpl: FetchImpl): Promise<unknown> {
  return getJson(`${OL_SEARCH}?${new URLSearchParams({ ...params, fields: FIELDS })}`, 'books', OL_HEADERS, fetchImpl);
}

function unique(items: ReleaseItem[]): ReleaseItem[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.externalId) ? false : (seen.add(i.externalId), true)));
}

/** "Em alta": Portuguese fiction first published in the last couple of years, most read first. */
export async function olTrendingPt(fetchImpl: FetchImpl = defaultFetch(), today: string = todaySaoPaulo()): Promise<ReleaseItem[]> {
  const year = Number(today.slice(0, 4));
  const json = await search({
    q: `language:por subject:fiction first_publish_year:[${year - TRENDING_YEARS} TO ${year}]`, sort: 'readinglog', limit: '40',
  }, fetchImpl);
  return unique(openLibraryRecent(json));
}

/**
 * "Ver mais" of books: one subject (or every book in Portuguese), pages 1 to `filter.page` in one request.
 */
export async function olSubject(subject: string | undefined, filter: ExploreFilter, fetchImpl: FetchImpl = defaultFetch()): Promise<Page> {
  const q = subject ? `subject:${subject} language:por` : 'language:por';
  const limit = PER_PAGE * filter.page;
  const json = await search({ q, sort: SORT[filter.sort], limit: String(limit), page: '1' }, fetchImpl);
  const found = (json as { numFound?: unknown })?.numFound;
  return {
    items: unique(openLibraryRecent(json)),
    hasMore: typeof found === 'number' && found > limit && filter.page < MAX_PAGE,
  };
}
