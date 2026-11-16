import { findBookByIsbn, findBookByTitle, searchGoogleBooks } from '@/lib/catalog/books-client';
import type { FetchImpl } from '@/lib/catalog/http';
import { fetchTmdbList } from '@/lib/catalog/tmdb-client';
import type { WorkKind } from '@/lib/catalog/types';

/**
 * Release rows for the home and the Timeline strip. Fetched live from TMDB and Google Books and kept only
 * in the fetch cache for a few hours: they are never written to the database (works are saved when someone
 * opens their page, as before).
 */
export type ReleaseItem = {
  kind: WorkKind;
  externalId: string;
  title: string;
  posterUrl: string | null;
  /** ISO yyyy-mm-dd */
  date: string | null;
  popularity: number;
  /** Short caption, e.g. "Nos cinemas" / "Em breve". */
  label?: string;
};

/** null = that source could not be loaded right now. */
export type Releases = {
  nowPlaying: ReleaseItem[] | null;
  upcoming: ReleaseItem[] | null;
  series: ReleaseItem[] | null;
  books: ReleaseItem[] | null;
};

export const RELEASES_REVALIDATE_S = 6 * 60 * 60;
export const BOOKS_REVALIDATE_S = 12 * 60 * 60;

const POSTER = 'https://image.tmdb.org/t/p/w342';
const TOP_SERIES = 20;
const MAX_BOOKS = 12;
const BOOK_WINDOW_DAYS = 183;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const arr = (v: unknown): Json[] => (Array.isArray(v) ? v : []);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isoDay = (v: unknown) => { const s = str(v); return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null; };
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A fetch that keeps answers in Next's data cache for `seconds` (plain `fetch` option, works on any host). */
export function cachedFetch(seconds: number, base: FetchImpl = fetch): FetchImpl {
  return ((input: Parameters<FetchImpl>[0], init?: RequestInit) =>
    base(input, { ...init, next: { revalidate: seconds } } as RequestInit)) as FetchImpl;
}

function tmdbItems(json: unknown, kind: 'movie' | 'series'): ReleaseItem[] {
  return arr((json as Json)?.results).flatMap((r): ReleaseItem[] => {
    const poster = str(r?.poster_path);
    const title = str(kind === 'movie' ? r?.title : r?.name);
    if (!poster || !title || r?.id == null) return [];
    return [{
      kind, externalId: String(r.id), title, posterUrl: `${POSTER}${poster}`,
      date: isoDay(kind === 'movie' ? r?.release_date : r?.first_air_date), popularity: num(r?.popularity),
    }];
  });
}

export const tmdbMovies = (json: unknown) => tmdbItems(json, 'movie');

export function tmdbSeries(json: unknown): ReleaseItem[] {
  return tmdbItems(json, 'series').sort((a, b) => b.popularity - a.popularity).slice(0, TOP_SERIES);
}

export type BookCandidate = { title: string; author: string | null; isbn: string | null; posterUrl: string; date: string };

function bookDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  return null; // a year alone is too vague to call it a recent release
}

/** Recent Portuguese books with a cover, newest first, one per title. Google's dates are imprecise (accepted). */
export function bookCandidates(json: unknown, today: string): BookCandidate[] {
  const since = addDays(today, -BOOK_WINDOW_DAYS);
  const seen = new Set<string>();
  const out: BookCandidate[] = [];
  for (const v of arr((json as Json)?.items)) {
    const info = v?.volumeInfo;
    const title = str(info?.title);
    const date = bookDate(info?.publishedDate);
    const cover = str(info?.imageLinks?.thumbnail) ?? str(info?.imageLinks?.smallThumbnail);
    if (!title || !date || !cover || date > today || date < since) continue;
    const key = fold(title);
    if (seen.has(key)) continue;
    seen.add(key);
    const ids = arr(info?.industryIdentifiers);
    const isbn = str(ids.find((i) => i?.type === 'ISBN_13')?.identifier) ?? str(ids.find((i) => i?.type === 'ISBN_10')?.identifier);
    out.push({
      title, date, isbn, author: str(arr(info?.authors)[0]),
      posterUrl: cover.replace(/^http:/, 'https:').replace(/([?&])zoom=\d+/, '$1zoom=1'),
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export async function nowPlaying(fetchImpl: FetchImpl = fetch): Promise<ReleaseItem[]> {
  const json = await fetchTmdbList('/movie/now_playing', { region: 'BR' }, fetchImpl);
  return tmdbMovies(json).map((i) => ({ ...i, label: 'Nos cinemas' }));
}

export async function upcoming(today: string, fetchImpl: FetchImpl = fetch): Promise<ReleaseItem[]> {
  const json = await fetchTmdbList('/movie/upcoming', { region: 'BR' }, fetchImpl);
  return tmdbMovies(json).filter((i) => i.date !== null && i.date > today).map((i) => ({ ...i, label: 'Em breve' }));
}

export async function seriesOnAir(fetchImpl: FetchImpl = fetch): Promise<ReleaseItem[]> {
  return tmdbSeries(await fetchTmdbList('/tv/on_the_air', {}, fetchImpl));
}

/** The Open Library work the book page uses; null when it cannot be found (that book is left out). */
async function openLibraryId(c: BookCandidate, fetchImpl: FetchImpl): Promise<string | null> {
  try {
    return (c.isbn ? await findBookByIsbn(c.isbn, fetchImpl) : null) ?? (await findBookByTitle(c.title, c.author, fetchImpl));
  } catch {
    return null;
  }
}

export async function bookReleases(today: string, fetchImpl: FetchImpl = fetch): Promise<ReleaseItem[]> {
  const json = await searchGoogleBooks('subject:fiction', { langRestrict: 'pt', orderBy: 'newest', printType: 'books', maxResults: '40' }, fetchImpl);
  const candidates = bookCandidates(json, today).slice(0, MAX_BOOKS);
  const ids = await Promise.all(candidates.map((c) => openLibraryId(c, fetchImpl)));
  const seen = new Set<string>();
  return candidates.flatMap((c, i): ReleaseItem[] => {
    const id = ids[i];
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{ kind: 'book', externalId: id, title: c.title, posterUrl: c.posterUrl, date: c.date, popularity: 0 }];
  });
}

async function settle(name: string, p: Promise<ReleaseItem[]>): Promise<ReleaseItem[] | null> {
  try {
    return await p;
  } catch (e) {
    console.error(`[home] releases ${name} failed:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** All rows; each source fails on its own. Pass a fetch for tests; by default answers are cached. */
export async function loadReleases(today: string, fetchImpl?: FetchImpl): Promise<Releases> {
  const tmdb = fetchImpl ?? cachedFetch(RELEASES_REVALIDATE_S);
  const books = fetchImpl ?? cachedFetch(BOOKS_REVALIDATE_S);
  const [np, up, series, bk] = await Promise.all([
    settle('now playing', nowPlaying(tmdb)),
    settle('upcoming', upcoming(today, tmdb)),
    settle('series', seriesOnAir(tmdb)),
    settle('books', bookReleases(today, books)),
  ]);
  return { nowPlaying: np, upcoming: up, series, books: bk };
}

const QUOTA: Array<[WorkKind, number]> = [['movie', 3], ['series', 3], ['book', 2]];
export const TRENDING_SIZE = 8;

/** ~8 popular releases for the Timeline strip: about 3 films, 3 series and 2 books, interleaved. */
export function trending(r: Releases): ReleaseItem[] {
  const seen = new Set<string>();
  const all = [...(r.nowPlaying ?? []), ...(r.upcoming ?? []), ...(r.series ?? []), ...(r.books ?? [])].filter((i) => {
    const key = `${i.kind}:${i.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const byKind = (k: WorkKind) => all.filter((i) => i.kind === k).sort((a, b) => b.popularity - a.popularity);
  const pools = QUOTA.map(([k, n]) => ({ picked: byKind(k).slice(0, n), rest: byKind(k).slice(n) }));

  const out: ReleaseItem[] = [];
  for (let round = 0; out.length < TRENDING_SIZE && pools.some((p) => p.picked[round]); round++) {
    for (const p of pools) if (p.picked[round] && out.length < TRENDING_SIZE) out.push(p.picked[round]);
  }
  const leftovers = pools.flatMap((p) => p.rest).sort((a, b) => b.popularity - a.popularity);
  return [...out, ...leftovers].slice(0, TRENDING_SIZE);
}
