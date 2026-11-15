import { describe, it, expect } from 'vitest';
import olSearch from '../fixtures/ol-search.json';
import olWork from '../fixtures/ol-work-OL1149208W.json';
import olWorkNoCover from '../fixtures/ol-work-nocover.json';
import olEditions from '../fixtures/ol-editions-OL1149208W.json';
import gbooksIsbn from '../fixtures/gbooks-isbn.json';
import gbooksEn from '../fixtures/gbooks-en.json';
import gbooksEmpty from '../fixtures/gbooks-empty.json';
import { normalizeOpenLibrarySearch, pickIsbns, normalizeBook } from '@/lib/catalog/books-normalize';

const authors = ['Machado de Assis'];

describe('normalizeOpenLibrarySearch', () => {
  it('search maps OL works to hits', () => {
    const hits = normalizeOpenLibrarySearch(olSearch);
    expect(hits).toHaveLength(3);
    expect(hits[0]).toEqual({
      kind: 'book', externalId: 'OL1149208W', title: 'Dom Casmurro', year: 1899,
      posterUrl: 'https://covers.openlibrary.org/b/id/8231856-L.jpg',
    });
    expect(hits.every((h) => /^OL\d+W$/.test(h.externalId))).toBe(true);
    expect(hits[1].posterUrl).toBeNull();
    expect(hits[2].year).toBeNull();
  });
});

describe('pickIsbns', () => {
  it('prefers Portuguese editions ISBNs', () => {
    const isbns = pickIsbns(olEditions);
    expect(isbns[0]).toBe('9788508040094');
    expect(isbns[1]).toBe('8508040091');
    expect(isbns.filter((i) => i === '9780195103090')).toHaveLength(1);
  });
  it('caps at 10 and tolerates bad input', () => {
    const many = { entries: Array.from({ length: 20 }, (_, i) => ({ isbn_13: [`97800000000${String(i).padStart(2, '0')}`] })) };
    expect(pickIsbns(many)).toHaveLength(10);
    expect(pickIsbns(null)).toEqual([]);
  });
});

describe('normalizeBook', () => {
  const isbns = pickIsbns(olEditions);

  it('enriches with Google Books in Portuguese', () => {
    const w = normalizeBook(olWork, authors, isbns, gbooksIsbn);
    expect(w.kind).toBe('book');
    expect(w.externalId).toBe('OL1149208W');
    expect(w.title).toBe('Dom Casmurro (Edição Especial)');
    expect(w.originalTitle).toBe('Dom Casmurro');
    expect(w.overview).toBe('Bentinho e Capitu.');
    expect(w.overviewLang).toBe('pt-BR');
    expect(w.posterUrl).toMatch(/^https:\/\//);
    expect(w.posterUrl).toContain('zoom=1');
    expect(w.people).toEqual(authors);
    expect(w.isbns).toEqual(isbns);
    expect(w.availability).toContainEqual({ provider: 'Google Play Livros', type: 'store', logoUrl: null, link: 'https://play.google.com/store/books/details?id=abc' });
    expect(w.trailerYoutubeKey).toBeNull();
    expect(w.seasons).toEqual([]);
  });

  it('works without Google Books match', () => {
    const w = normalizeBook(olWork, authors, isbns, gbooksEmpty);
    expect(w.title).toBe('Dom Casmurro');
    expect(w.originalTitle).toBeNull();
    expect(w.overview).toBe('Bento Santiago tells his story.');
    expect(w.overviewLang).toBe('en');
    expect(w.posterUrl).toBe('https://covers.openlibrary.org/b/id/8231856-L.jpg');
    const providers = w.availability.map((a) => a.provider);
    expect(providers).toEqual(['Amazon', 'Estante Virtual']);
    expect(w.availability[0].link).toBe('https://www.amazon.com.br/s?k=9788508040094');
    expect(w.availability[1].link).toBe('https://www.estantevirtual.com.br/busca?q=Dom%20Casmurro');
  });

  it('no cover anywhere gives null poster', () => {
    const w = normalizeBook(olWorkNoCover, [], [], null);
    expect(w.posterUrl).toBeNull();
    expect(w.overview).toBe('Plain description.');
    expect(w.availability.map((a) => a.provider)).toEqual(['Estante Virtual']);
  });

  it('normalizes partial dates', () => {
    expect(normalizeBook(olWork, authors, isbns, gbooksIsbn).releaseDateBR).toBe('2019-01-01');
    expect(normalizeBook(olWork, authors, isbns, gbooksEn).releaseDateBR).toBe('1997-05-01');
    expect(normalizeBook(olWork, authors, isbns, null).releaseDateBR).toBeNull();
  });

  it('marks English Google Books description as en', () => {
    const w = normalizeBook(olWork, authors, isbns, gbooksEn);
    expect(w.overviewLang).toBe('en');
    expect(w.overview).toBe('An English blurb.');
  });
});

describe('Google Books language codes', () => {
  it('treats pt-BR description as Portuguese', async () => {
    const gbooksPtBr = (await import('../fixtures/gbooks-ptbr.json')).default;
    const w = normalizeBook(olWork, authors, [], gbooksPtBr);
    expect(w.overviewLang).toBe('pt-BR');
    expect(w.overview).toBe('Capitu tem olhos de ressaca.');
  });
});
