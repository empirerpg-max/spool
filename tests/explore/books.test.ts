import { afterEach, describe, it, expect, vi } from 'vitest';
import { olSubject, olTrendingPt } from '@/lib/explore/books';
import { fakeFetch } from '../catalog/clients.helpers';

const doc = (n: number, extra: Record<string, unknown> = {}) => ({ key: `/works/OL${n}W`, title: `Livro ${n}`, cover_i: n, ...extra });
const calledUrl = (f: ReturnType<typeof fakeFetch>) => new URL(String(f.mock.calls[0][0]));

afterEach(() => { vi.restoreAllMocks(); });

describe('Open Library lists wait longer than interactive search', () => {
  it('Em alta and "ver mais" give Open Library 15 seconds', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await olTrendingPt(fakeFetch([{ match: /search\.json/, body: { numFound: 0, docs: [] } }]), '2026-11-17');
    expect(timeout).toHaveBeenLastCalledWith(15_000);
    await olSubject('horror', { sort: 'populares', page: 1 }, fakeFetch([{ match: /search\.json/, body: { numFound: 0, docs: [] } }]));
    expect(timeout).toHaveBeenLastCalledWith(15_000);
  });
});

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
    for (const [sort, ol] of [['populares', 'readinglog'], ['avaliados', 'rating']] as const) {
      const f = fakeFetch([{ match: /search\.json/, body: { numFound: 0, docs: [] } }]);
      await olSubject('romance', { sort, page: 1 }, f);
      expect(calledUrl(f).searchParams.get('sort')).toBe(ol);
    }
  });

  it('no subject: the same recent Portuguese fiction as "Em alta" (a cheap query)', async () => {
    const f = fakeFetch([{ match: /search\.json/, body: { numFound: 0, docs: [] } }]);
    await olSubject(undefined, { sort: 'populares', page: 1 }, f, '2026-11-17');
    const q = calledUrl(f).searchParams.get('q');
    expect(q).toContain('language:por');
    expect(q).toContain('subject:fiction');
    expect(q).toContain('first_publish_year:[2024 TO 2026]');
  });

  it('says where the page just loaded starts, counting only covers actually shown', async () => {
    // 24 answers per page; on page 1 only 10 have a cover, so page 2 starts at the 11th cover.
    const docs = [
      ...Array.from({ length: 24 }, (_, n) => doc(n + 1, n < 10 ? {} : { cover_i: null })),
      ...Array.from({ length: 24 }, (_, n) => doc(n + 101)),
    ];
    const f = fakeFetch([{ match: /search\.json/, body: { numFound: 1000, docs } }]);
    const r = await olSubject('horror', { sort: 'populares', page: 2 }, f);
    expect(r.items).toHaveLength(34);
    expect(r.newFrom).toBe(10);
    expect(r.items[r.newFrom].externalId).toBe('OL101W');

    const g = fakeFetch([{ match: /search\.json/, body: { numFound: 1, docs: [doc(1)] } }]);
    expect((await olSubject('horror', { sort: 'populares', page: 1 }, g)).newFrom).toBe(0);
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
