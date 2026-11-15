import { describe, it, expect, vi } from 'vitest';
import { matchRow } from '@/lib/import/match';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import type { ImportRow } from '@/lib/import/types';
import type { SearchHit } from '@/lib/catalog/types';

const movie = (over: Partial<ImportRow> = {}): ImportRow => ({
  kind: 'movie', title: 'Dune', year: 2021, author: null, isbn: null, status: 'quero', rating: null, review: null, finishedOn: null, ...over,
});
const book = (over: Partial<ImportRow> = {}): ImportRow => ({ ...movie(), kind: 'book', title: 'Dom Casmurro', year: 1899, author: 'Machado de Assis', ...over });
const hit = (id: string, year: number | null): SearchHit => ({ kind: 'movie', externalId: id, title: 'Dune', year, posterUrl: null });

const deps = (over: Partial<Parameters<typeof matchRow>[1]> = {}) => ({
  searchMovie: vi.fn(async () => [] as SearchHit[]),
  byIsbn: vi.fn(async () => null as string | null),
  byTitle: vi.fn(async () => null as string | null),
  ...over,
});

describe('matchRow', () => {
  it('prefers the hit from the same year', async () => {
    const d = deps({ searchMovie: vi.fn(async () => [hit('841', 1984), hit('438631', 2021)]) });
    expect(await matchRow(movie(), d)).toEqual({ kind: 'movie', externalId: '438631' });
  });

  it('retries without year when nothing matches the year', async () => {
    const searchMovie = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([hit('1', 2020)]);
    expect(await matchRow(movie(), deps({ searchMovie }))).toEqual({ kind: 'movie', externalId: '1' });
    expect(searchMovie).toHaveBeenNthCalledWith(1, 'Dune', 2021);
    expect(searchMovie).toHaveBeenNthCalledWith(2, 'Dune', null);
  });

  it('takes the first hit when the year is unknown', async () => {
    const d = deps({ searchMovie: vi.fn(async () => [hit('9', 1999), hit('8', 2000)]) });
    expect(await matchRow(movie({ year: null }), d)).toEqual({ kind: 'movie', externalId: '9' });
  });

  it('returns null when no movie is found', async () => {
    expect(await matchRow(movie(), deps())).toBeNull();
  });

  it('uses ISBN for books, then title and author', async () => {
    const byIsbn = vi.fn(async () => 'OL1W');
    expect(await matchRow(book({ isbn: '978' }), deps({ byIsbn }))).toEqual({ kind: 'book', externalId: 'OL1W' });

    const byTitle = vi.fn(async () => 'OL2W');
    expect(await matchRow(book({ isbn: '978' }), deps({ byTitle }))).toEqual({ kind: 'book', externalId: 'OL2W' });
    expect(byTitle).toHaveBeenCalledWith('Dom Casmurro', 'Machado de Assis');

    const noIsbn = deps({ byTitle: vi.fn(async () => 'OL3W') });
    expect(await matchRow(book(), noIsbn)).toEqual({ kind: 'book', externalId: 'OL3W' });
    expect(noIsbn.byIsbn).not.toHaveBeenCalled();
  });

  it('lets source outages propagate so the batch can retry later', async () => {
    const d = deps({ searchMovie: vi.fn(async () => { throw new CatalogUnavailableError('tmdb'); }) });
    await expect(matchRow(movie(), d)).rejects.toBeInstanceOf(CatalogUnavailableError);
  });
});
