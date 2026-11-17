import { describe, it, expect } from 'vitest';
import { olSubject, olTrendingPt } from '@/lib/explore/books';
import { fakeFetch } from '../catalog/clients.helpers';

const doc = (n: number, extra: Record<string, unknown> = {}) => ({ key: `/works/OL${n}W`, title: `Livro ${n}`, cover_i: n, ...extra });
const calledUrl = (f: ReturnType<typeof fakeFetch>) => new URL(String(f.mock.calls[0][0]));

describe('olTrendingPt', () => {
  it('recent Portuguese fiction, most read, with cover', async () => {
    const f = fakeFetch([{ match: /openlibrary\.org\/search\.json/, body: { numFound: 2, docs: [doc(1), doc(2, { cover_i: null })] } }]);
    const items = await olTrendingPt(f, '2026-11-17');
    expect(items).toEqual([{ kind: 'book', externalId: 'OL1W', title: 'Livro 1', posterUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg', date: null, popularity: 0 }]);
    const u = calledUrl(f);
    expect(u.searchParams.get('q')).toContain('language:por');
    expect(u.searchParams.get('q')).toContain('subject:fiction');
    expect(u.searchParams.get('q')).toContain('first_publish_year:[2024 TO 2026]');
    expect(u.searchParams.get('sort')).toBe('readinglog');
  });

  it('fails when Open Library is down', async () => {
    await expect(olTrendingPt(fakeFetch([{ match: /openlibrary/, status: 503 }]), '2026-11-17')).rejects.toThrow();
  });
});

describe('olSubject', () => {
  it('books on a subject in Portuguese', async () => {
    const f = fakeFetch([{ match: /search\.json/, body: { numFound: 1, docs: [doc(5)] } }]);
    const r = await olSubject('horror', { sort: 'populares', page: 1 }, f);
    expect(r.items.map((i) => i.externalId)).toEqual(['OL5W']);
    const u = calledUrl(f);
    expect(u.searchParams.get('q')).toContain('subject:horror');
    expect(u.searchParams.get('q')).toContain('language:por');
    expect(u.searchParams.get('sort')).toBe('readinglog');
  });

  it('maps the order', async () => {
    for (const [sort, ol] of [['avaliados', 'rating'], ['recentes', 'new']] as const) {
      const f = fakeFetch([{ match: /search\.json/, body: { numFound: 0, docs: [] } }]);
      await olSubject('romance', { sort, page: 1 }, f);
      expect(calledUrl(f).searchParams.get('sort')).toBe(ol);
    }
  });

  it('no subject: all books in Portuguese', async () => {
    const f = fakeFetch([{ match: /search\.json/, body: { numFound: 0, docs: [] } }]);
    await olSubject(undefined, { sort: 'populares', page: 1 }, f);
    expect(calledUrl(f).searchParams.get('q')).toBe('language:por');
  });

  it('page 2 asks for the first two pages at once and says whether there is more', async () => {
    const f = fakeFetch([{ match: /search\.json/, body: { numFound: 100, docs: [doc(1), doc(1), doc(2)] } }]);
    const r = await olSubject('horror', { sort: 'populares', page: 2 }, f);
    const u = calledUrl(f);
    expect(u.searchParams.get('limit')).toBe('48');
    expect(u.searchParams.get('page')).toBe('1');
    expect(r.items.map((i) => i.externalId)).toEqual(['OL1W', 'OL2W']);
    expect(r.hasMore).toBe(true);

    const g = fakeFetch([{ match: /search\.json/, body: { numFound: 40, docs: [doc(1)] } }]);
    expect((await olSubject('horror', { sort: 'populares', page: 2 }, g)).hasMore).toBe(false);
  });
});
