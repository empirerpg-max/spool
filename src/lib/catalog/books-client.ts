import { getJson, type FetchImpl } from './http';
import { WorkNotFoundError } from './errors';
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

/** Raw Google Books volume search; throws CatalogUnavailableError when Google is down. */
export async function searchGoogleBooks(q: string, extra: Record<string, string>, fetchImpl: FetchImpl = fetch): Promise<unknown> {
  const params = new URLSearchParams({ q, ...extra });
  if (process.env.GOOGLE_BOOKS_API_KEY) params.set('key', process.env.GOOGLE_BOOKS_API_KEY);
  return getJson(`${GB}?${params}`, 'books', { Accept: 'application/json' }, fetchImpl);
}

function googleBooks(q: string, extra: Record<string, string>, fetchImpl: FetchImpl): Promise<unknown | null> {
  return optional(searchGoogleBooks(q, extra, fetchImpl));
}

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** A title-search hit is only trusted when its title contains the Open Library title. */
function sameBook(gbooks: unknown, olTitle: string): boolean {
  const title = (gbooks as { items?: Array<{ volumeInfo?: { title?: string } }> })?.items?.[0]?.volumeInfo?.title;
  return typeof title === 'string' && fold(title).includes(fold(olTitle));
}

type OlWork = { title?: string; type?: { key?: string }; location?: string; authors?: Array<{ author?: { key?: string } }> };

/** Open Library answers merged works with a 200 redirect record; deleted works with a delete record. */
async function loadWork(olWorkId: string, fetchImpl: FetchImpl): Promise<OlWork> {
  let work = (await getJson(`${OL}/works/${olWorkId}.json`, 'books', OL_HEADERS, fetchImpl)) as OlWork;
  if (work?.type?.key === '/type/redirect' && typeof work.location === 'string') {
    work = (await getJson(`${OL}${work.location}.json`, 'books', OL_HEADERS, fetchImpl)) as OlWork;
  }
  if (work?.type?.key === '/type/delete' || work?.type?.key === '/type/redirect' || !work?.title) {
    throw new WorkNotFoundError(olWorkId);
  }
  return work;
}

const hasItems = (j: unknown) => Array.isArray((j as { items?: unknown[] } | null)?.items) && (j as { items: unknown[] }).items.length > 0;

export async function fetchBook(olWorkId: string, fetchImpl: FetchImpl = fetch): Promise<NormalizedWork> {
  const work = await loadWork(olWorkId, fetchImpl);
  const canonicalId = String((work as { key?: string }).key ?? `/works/${olWorkId}`).replace(/^\/works\//, '');

  const authorKeys = (work.authors ?? []).map((a) => a?.author?.key).filter((k): k is string => !!k).slice(0, MAX_AUTHORS);
  const [authorJsons, editions] = await Promise.all([
    Promise.all(authorKeys.map((k) => optional(getJson(`${OL}${k}.json`, 'books', OL_HEADERS, fetchImpl)))),
    optional(getJson(`${OL}/works/${canonicalId}/editions.json?limit=50`, 'books', OL_HEADERS, fetchImpl)),
  ]);
  const authors = authorJsons.map((a) => (a as { name?: string } | null)?.name).filter((n): n is string => !!n);
  const isbns = pickIsbns(editions);

  let gbooks: unknown | null = null;
  if (isbns[0]) gbooks = await googleBooks(`isbn:${isbns[0]}`, {}, fetchImpl);
  if (!hasItems(gbooks) && work.title) {
    const q = `intitle:"${work.title}"${authors[0] ? ` inauthor:"${authors[0]}"` : ''}`;
    const byTitle = await googleBooks(q, { langRestrict: 'pt' }, fetchImpl);
    if (hasItems(byTitle) && sameBook(byTitle, work.title)) gbooks = byTitle;
  }

  // Cache under the id that was requested, so a redirected work still hits the cache next time.
  return { ...normalizeBook(work, authors, isbns, hasItems(gbooks) ? gbooks : null), externalId: olWorkId };
}

export async function searchBooks(query: string, fetchImpl: FetchImpl = fetch): Promise<SearchHit[]> {
  const params = new URLSearchParams({ q: query, limit: '10', fields: 'key,title,first_publish_year,cover_i' });
  return normalizeOpenLibrarySearch(await getJson(`${OL}/search.json?${params}`, 'books', OL_HEADERS, fetchImpl));
}

const olWorkId = (key: unknown) => (typeof key === 'string' && key.startsWith('/works/') ? key.slice('/works/'.length) : null);

/** ISBN → Open Library work id, or null when unknown. */
export async function findBookByIsbn(isbn: string, fetchImpl: FetchImpl = fetch): Promise<string | null> {
  try {
    const ed = (await getJson(`${OL}/isbn/${encodeURIComponent(isbn)}.json`, 'books', OL_HEADERS, fetchImpl)) as { works?: Array<{ key?: string }> };
    return olWorkId(ed?.works?.[0]?.key);
  } catch (e) {
    if (e instanceof WorkNotFoundError) return null;
    throw e;
  }
}

/** Best Open Library work for a title (+ author), or null. */
export async function findBookByTitle(title: string, author: string | null, fetchImpl: FetchImpl = fetch): Promise<string | null> {
  const params = new URLSearchParams({ title, limit: '1', fields: 'key' });
  if (author) params.set('author', author);
  const json = (await getJson(`${OL}/search.json?${params}`, 'books', OL_HEADERS, fetchImpl)) as { docs?: Array<{ key?: string }> };
  return olWorkId(json?.docs?.[0]?.key);
}
