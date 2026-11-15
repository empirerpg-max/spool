import { describe, it, expect, vi } from 'vitest';
import { searchCatalog } from '@/lib/catalog/search';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import type { SearchHit } from '@/lib/catalog/types';

const movie: SearchHit = { kind: 'movie', externalId: '603', title: 'Matrix', year: 1999, posterUrl: null };
const book: SearchHit = { kind: 'book', externalId: 'OL1W', title: 'Matrix Book', year: 2000, posterUrl: null };

describe('searchCatalog', () => {
  it('short or empty query makes no calls', async () => {
    const tmdb = vi.fn(); const books = vi.fn();
    expect(await searchCatalog('  a ', { tmdb, books })).toEqual({ hits: [], unavailable: [] });
    expect(await searchCatalog('', { tmdb, books })).toEqual({ hits: [], unavailable: [] });
    expect(tmdb).not.toHaveBeenCalled();
    expect(books).not.toHaveBeenCalled();
  });

  it('TMDB down still returns books and reports tmdb unavailable', async () => {
    const r = await searchCatalog('matrix', {
      tmdb: vi.fn(async () => { throw new CatalogUnavailableError('tmdb'); }),
      books: vi.fn(async () => [book]),
    });
    expect(r).toEqual({ hits: [book], unavailable: ['tmdb'] });
  });

  it('puts TMDB hits before book hits and trims the query', async () => {
    const tmdb = vi.fn(async () => [movie]);
    const books = vi.fn(async () => [book]);
    const r = await searchCatalog('  matrix  ', { tmdb, books });
    expect(tmdb).toHaveBeenCalledWith('matrix');
    expect(r.hits).toEqual([movie, book]);
    expect(r.unavailable).toEqual([]);
  });
});

describe('searchCatalog logging', () => {
  it('logs why a source failed so it shows up in server logs', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await searchCatalog('matrix', {
      tmdb: vi.fn(async () => { throw new CatalogUnavailableError('tmdb', 'tmdb respondeu 401'); }),
      books: vi.fn(async () => []),
    });
    expect(spy).toHaveBeenCalledWith('[catalog] tmdb search failed:', 'tmdb respondeu 401');
    spy.mockRestore();
  });
});
