import { findBookByIsbn, findBookByTitle } from '@/lib/catalog/books-client';
import { searchTmdbMovie } from '@/lib/catalog/tmdb-client';
import type { SearchHit, WorkKind } from '@/lib/catalog/types';
import type { ImportRow } from './types';

type Deps = {
  searchMovie: (title: string, year: number | null) => Promise<SearchHit[]>;
  byIsbn: (isbn: string) => Promise<string | null>;
  byTitle: (title: string, author: string | null) => Promise<string | null>;
};

const DEFAULTS: Deps = {
  searchMovie: (t, y) => searchTmdbMovie(t, y),
  byIsbn: (i) => findBookByIsbn(i),
  byTitle: (t, a) => findBookByTitle(t, a),
};

/** Finds the catalog work for an imported row. Source outages (CatalogUnavailableError) propagate. */
export async function matchRow(row: ImportRow, deps: Deps = DEFAULTS): Promise<{ kind: WorkKind; externalId: string } | null> {
  if (row.kind === 'book') {
    const id = (row.isbn ? await deps.byIsbn(row.isbn) : null) ?? (await deps.byTitle(row.title, row.author));
    return id ? { kind: 'book', externalId: id } : null;
  }

  let hits = await deps.searchMovie(row.title, row.year);
  let pick = row.year === null ? hits[0] : hits.find((h) => h.year === row.year);
  if (!pick && row.year !== null) {
    // Release years differ by a year between sites (festival vs. theatrical); further than that is another film.
    hits = await deps.searchMovie(row.title, null);
    pick = hits.find((h) => h.year === row.year) ?? hits.find((h) => h.year !== null && Math.abs(h.year - row.year!) <= 1);
  }
  return pick ? { kind: 'movie', externalId: pick.externalId } : null;
}
