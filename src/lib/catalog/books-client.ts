import { getJson, type FetchImpl } from './http';
import { normalizeBook, normalizeOpenLibrarySearch, pickIsbns } from './books-normalize';
import type { NormalizedWork, SearchHit } from './types';

const OL = 'https://openlibrary.org';
const GB = 'https://www.googleapis.com/books/v1/volumes';
const OL_HEADERS = { 'User-Agent': 'Lobby/0.1 (catalog)', Accept: 'application/json' };
const MAX_AUTHORS = 3;

/** Secondary lookups (authors, editions, Google Books) never fail the whole book. */
async function optional<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

async function googleBooks(q: string, extra: Record<string, string>, fetchImpl: FetchImpl): Promise<unknown | null> {
  const params = new URLSearchParams({ q, ...extra });
  if (process.env.GOOGLE_BOOKS_API_KEY) params.set('key', process.env.GOOGLE_BOOKS_API_KEY);
  return optional(getJson(`${GB}?${params}`, 'books', { Accept: 'application/json' }, fetchImpl));
}

const hasItems = (j: unknown) => Array.isArray((j as { items?: unknown[] } | null)?.items) && (j as { items: unknown[] }).items.length > 0;

export async function fetchBook(olWorkId: string, fetchImpl: FetchImpl = fetch): Promise<NormalizedWork> {
  const work = (await getJson(`${OL}/works/${olWorkId}.json`, 'books', OL_HEADERS, fetchImpl)) as {
    title?: string;
    authors?: Array<{ author?: { key?: string } }>;
  };

  const authorKeys = (work.authors ?? []).map((a) => a?.author?.key).filter((k): k is string => !!k).slice(0, MAX_AUTHORS);
  const [authorJsons, editions] = await Promise.all([
    Promise.all(authorKeys.map((k) => optional(getJson(`${OL}${k}.json`, 'books', OL_HEADERS, fetchImpl)))),
    optional(getJson(`${OL}/works/${olWorkId}/editions.json?limit=50`, 'books', OL_HEADERS, fetchImpl)),
  ]);
  const authors = authorJsons.map((a) => (a as { name?: string } | null)?.name).filter((n): n is string => !!n);
  const isbns = pickIsbns(editions);

  let gbooks: unknown | null = null;
  if (isbns[0]) gbooks = await googleBooks(`isbn:${isbns[0]}`, {}, fetchImpl);
  if (!hasItems(gbooks) && work.title) {
    const q = `intitle:${work.title}${authors[0] ? `+inauthor:${authors[0]}` : ''}`;
    const byTitle = await googleBooks(q, { langRestrict: 'pt' }, fetchImpl);
    if (hasItems(byTitle)) gbooks = byTitle;
  }

  return normalizeBook(work, authors, isbns, hasItems(gbooks) ? gbooks : null);
}

export async function searchBooks(query: string, fetchImpl: FetchImpl = fetch): Promise<SearchHit[]> {
  const params = new URLSearchParams({ q: query, limit: '10', fields: 'key,title,first_publish_year,cover_i' });
  return normalizeOpenLibrarySearch(await getJson(`${OL}/search.json?${params}`, 'books', OL_HEADERS, fetchImpl));
}
