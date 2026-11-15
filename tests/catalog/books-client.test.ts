import { describe, it, expect } from 'vitest';
import olSearch from '../fixtures/ol-search.json';
import olWork from '../fixtures/ol-work-OL1149208W.json';
import olAuthor from '../fixtures/ol-author-OL24529A.json';
import olEditions from '../fixtures/ol-editions-OL1149208W.json';
import gbooksIsbn from '../fixtures/gbooks-isbn.json';
import gbooksEmpty from '../fixtures/gbooks-empty.json';
import { fetchBook, searchBooks } from '@/lib/catalog/books-client';
import { CatalogUnavailableError, WorkNotFoundError } from '@/lib/catalog/errors';
import { fakeFetch } from './clients.helpers';

const olRoutes = () => [
  { match: /openlibrary\.org\/works\/OL1149208W\.json/, body: olWork },
  { match: /openlibrary\.org\/authors\/OL24529A\.json/, body: olAuthor },
  { match: /openlibrary\.org\/works\/OL1149208W\/editions\.json/, body: olEditions },
];

describe('fetchBook', () => {
  it('combines Open Library and Google Books by ISBN', async () => {
    const f = fakeFetch([...olRoutes(), { match: /googleapis.*isbn%3A9788508040094/, body: gbooksIsbn }]);
    const w = await fetchBook('OL1149208W', f);
    expect(w.title).toBe('Dom Casmurro (Edição Especial)');
    expect(w.people).toEqual(['Machado de Assis']);
    expect(w.overviewLang).toBe('pt-BR');
    const olCall = f.mock.calls.find(([u]) => String(u).includes('openlibrary'))!;
    expect((olCall[1] as RequestInit).headers).toMatchObject({ 'User-Agent': 'Lobby/0.1 (catalog)' });
  });

  it('falls back to title and author search when ISBN has no match', async () => {
    const f = fakeFetch([
      ...olRoutes(),
      { match: /googleapis.*isbn/, body: gbooksEmpty },
      { match: /googleapis.*intitle/, body: gbooksIsbn },
    ]);
    const w = await fetchBook('OL1149208W', f);
    const titleCall = String(f.mock.calls.find(([u]) => String(u).includes('intitle'))![0]);
    expect(titleCall).toContain('langRestrict=pt');
    expect(w.overviewLang).toBe('pt-BR');
  });

  it('fetchBook survives Google Books failure', async () => {
    const f = fakeFetch([...olRoutes(), { match: /googleapis/, status: 500 }]);
    const w = await fetchBook('OL1149208W', f);
    expect(w.title).toBe('Dom Casmurro');
    expect(w.availability.map((a) => a.provider)).toEqual(['Amazon', 'Estante Virtual']);
  });

  it('missing work throws WorkNotFoundError', async () => {
    const f = fakeFetch([{ match: /works\/OL9W\.json/, status: 404 }]);
    await expect(fetchBook('OL9W', f)).rejects.toBeInstanceOf(WorkNotFoundError);
  });

  it('Open Library down throws CatalogUnavailableError with source books', async () => {
    const f = fakeFetch([{ match: /works\/OL9W\.json/, status: 503 }]);
    await expect(fetchBook('OL9W', f)).rejects.toMatchObject({ name: 'CatalogUnavailableError', source: 'books' });
    expect(CatalogUnavailableError).toBeDefined();
  });
});

describe('searchBooks', () => {
  it('searchBooks encodes accents', async () => {
    const f = fakeFetch([{ match: /search\.json/, body: olSearch }]);
    const hits = await searchBooks('memórias póstumas', f);
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain('mem%C3%B3rias');
    expect(url).toContain('limit=10');
    expect(hits[0].kind).toBe('book');
  });
});
