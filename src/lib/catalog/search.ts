import { searchBooks } from './books-client';
import { searchTmdb } from './tmdb-client';
import type { SearchHit } from './types';

type Deps = { tmdb: (q: string) => Promise<SearchHit[]>; books: (q: string) => Promise<SearchHit[]> };

const MIN_QUERY = 2;

export async function searchCatalog(
  query: string,
  deps: Deps = { tmdb: (q) => searchTmdb(q), books: (q) => searchBooks(q) },
): Promise<{ hits: SearchHit[]; unavailable: Array<'tmdb' | 'books'> }> {
  const q = query.trim();
  if (q.length < MIN_QUERY) return { hits: [], unavailable: [] };

  const [tmdb, books] = await Promise.allSettled([deps.tmdb(q), deps.books(q)]);
  const unavailable: Array<'tmdb' | 'books'> = [];
  if (tmdb.status === 'rejected') unavailable.push('tmdb');
  if (books.status === 'rejected') unavailable.push('books');
  return {
    hits: [...(tmdb.status === 'fulfilled' ? tmdb.value : []), ...(books.status === 'fulfilled' ? books.value : [])],
    unavailable,
  };
}
