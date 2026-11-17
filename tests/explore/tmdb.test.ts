import { describe, it, expect, beforeEach } from 'vitest';
import { moreAnchor, tmdbDiscover, tmdbTopRated, tmdbTrending } from '@/lib/explore/tmdb';
import { fakeFetch } from '../catalog/clients.helpers';

beforeEach(() => { process.env.TMDB_API_READ_TOKEN = 'test-token'; });

const movie = (id: number, extra: Record<string, unknown> = {}) => ({ id, title: `Filme ${id}`, poster_path: `/p${id}.jpg`, popularity: id, ...extra });
const show = (id: number) => ({ id, name: `Série ${id}`, poster_path: `/s${id}.jpg`, popularity: id });
const page = (results: unknown[], p = 1, total = 5) => ({ page: p, total_pages: total, results });
const calledUrl = (f: ReturnType<typeof fakeFetch>, i = 0) => new URL(String(f.mock.calls[i][0]));

describe('tmdbTrending', () => {
  it('uses the weekly trending list and skips items without poster', async () => {
    const f = fakeFetch([{ match: /trending\/movie\/week/, body: page([movie(1), movie(2, { poster_path: null })]) }]);
    const items = await tmdbTrending('movie', f);
    expect(items.map((i) => i.externalId)).toEqual(['1']);
    expect(items[0]).toMatchObject({ kind: 'movie', title: 'Filme 1', posterUrl: 'https://image.tmdb.org/t/p/w342/p1.jpg' });
    expect(calledUrl(f).searchParams.get('language')).toBe('pt-BR');
  });

  it('series use the tv list', async () => {
    const f = fakeFetch([{ match: /trending\/tv\/week/, body: page([show(7)]) }]);
    expect((await tmdbTrending('series', f))[0]).toMatchObject({ kind: 'series', externalId: '7', title: 'Série 7' });
  });
});

describe('tmdbTopRated', () => {
  it('sorts by score with a high minimum of votes', async () => {
    const f = fakeFetch([{ match: /discover\/movie/, body: page([movie(3)]) }]);
    expect((await tmdbTopRated('movie', f)).map((i) => i.externalId)).toEqual(['3']);
    const u = calledUrl(f);
    expect(u.searchParams.get('sort_by')).toBe('vote_average.desc');
    expect(Number(u.searchParams.get('vote_count.gte'))).toBeGreaterThanOrEqual(300);
  });
});

describe('tmdbDiscover', () => {
  it('films on a service in Brazil, by genre, best rated', async () => {
    const f = fakeFetch([{ match: /discover\/movie/, body: page([movie(1)]) }]);
    await tmdbDiscover('movie', { provider: 8, genre: 27, sort: 'avaliados', page: 1 }, f, '2026-11-17');
    const u = calledUrl(f);
    expect(u.pathname).toBe('/3/discover/movie');
    expect(u.searchParams.get('with_watch_providers')).toBe('8');
    expect(u.searchParams.get('watch_region')).toBe('BR');
    expect(u.searchParams.get('with_genres')).toBe('27');
    expect(u.searchParams.get('sort_by')).toBe('vote_average.desc');
    expect(u.searchParams.get('vote_count.gte')).toBe('1000');
    expect(u.searchParams.get('include_adult')).toBe('false');
  });

  it('best rated leaves out titles released in the last 6 months (fan votes inflate new releases)', async () => {
    const f = fakeFetch([{ match: /discover\/movie/, body: page([movie(1)]) }]);
    await tmdbDiscover('movie', { sort: 'avaliados', page: 1 }, f, '2026-11-17');
    expect(calledUrl(f).searchParams.get('primary_release_date.lte')).toBe('2026-05-21');
  });

  it('best rated series: 500 votes and first aired at least 6 months ago', async () => {
    const f = fakeFetch([{ match: /discover\/tv/, body: page([]) }]);
    await tmdbDiscover('series', { sort: 'avaliados', page: 1 }, f, '2026-11-17');
    const u = calledUrl(f);
    expect(u.searchParams.get('vote_count.gte')).toBe('500');
    expect(u.searchParams.get('first_air_date.lte')).toBe('2026-05-21');
  });

  it('popular films without filters', async () => {
    const f = fakeFetch([{ match: /discover\/movie/, body: page([movie(1)]) }]);
    await tmdbDiscover('movie', { sort: 'populares', page: 1 }, f, '2026-11-17');
    const u = calledUrl(f);
    expect(u.searchParams.get('sort_by')).toBe('popularity.desc');
    expect(u.searchParams.has('with_watch_providers')).toBe(false);
    expect(u.searchParams.has('with_genres')).toBe(false);
  });

  it('newest films: already released, by release date', async () => {
    const f = fakeFetch([{ match: /discover\/movie/, body: page([movie(1)]) }]);
    await tmdbDiscover('movie', { sort: 'recentes', page: 1 }, f, '2026-11-17');
    const u = calledUrl(f);
    expect(u.searchParams.get('sort_by')).toBe('primary_release_date.desc');
    expect(u.searchParams.get('primary_release_date.lte')).toBe('2026-11-17');
  });

  it('series use /discover/tv and first air date for newest', async () => {
    const f = fakeFetch([{ match: /discover\/tv/, body: page([show(1)]) }]);
    const r = await tmdbDiscover('series', { sort: 'recentes', page: 1 }, f, '2026-11-17');
    const u = calledUrl(f);
    expect(u.pathname).toBe('/3/discover/tv');
    expect(u.searchParams.get('sort_by')).toBe('first_air_date.desc');
    expect(u.searchParams.get('first_air_date.lte')).toBe('2026-11-17');
    expect(r.items[0]).toMatchObject({ kind: 'series', externalId: '1' });
  });

  it('page 3 brings pages 1 to 3, without repeats, and says whether there is more', async () => {
    const f = fakeFetch([
      { match: /page=1(&|$)/, body: page([movie(1), movie(2)], 1, 3) },
      { match: /page=2(&|$)/, body: page([movie(2), movie(3)], 2, 3) },
      { match: /page=3(&|$)/, body: page([movie(4)], 3, 3) },
    ]);
    const r = await tmdbDiscover('movie', { sort: 'populares', page: 3 }, f, '2026-11-17');
    expect(r.items.map((i) => i.externalId)).toEqual(['1', '2', '3', '4']);
    expect(r.hasMore).toBe(false);
    // Page 3 starts after the 3 different works of pages 1 and 2 (the repeat is not shown twice).
    expect(r.newFrom).toBe(3);
  });

  it('has more while TMDB has more pages (up to 20)', async () => {
    const f = fakeFetch([{ match: /discover/, body: page([movie(1)], 1, 500) }]);
    expect((await tmdbDiscover('movie', { sort: 'populares', page: 1 }, f, '2026-11-17')).hasMore).toBe(true);
  });

  it('a later page failing keeps the earlier ones', async () => {
    const f = fakeFetch([
      { match: /page=1(&|$)/, body: page([movie(1)], 1, 9) },
      { match: /page=2(&|$)/, status: 500 },
    ]);
    const r = await tmdbDiscover('movie', { sort: 'populares', page: 2 }, f, '2026-11-17');
    expect(r.items.map((i) => i.externalId)).toEqual(['1']);
    expect(r.hasMore).toBe(false);
  });

  it('fails when the first page fails', async () => {
    const f = fakeFetch([{ match: /discover/, status: 500 }]);
    await expect(tmdbDiscover('movie', { sort: 'populares', page: 1 }, f, '2026-11-17')).rejects.toThrow();
  });
});

describe('moreAnchor ("Carregar mais" lands on the first new cover)', () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({
    kind: 'book' as const, externalId: `OL${i}W`, title: `L${i}`, posterUrl: null, date: null, popularity: 0,
  }));
  it('uses how many covers the earlier pages really showed', () => {
    expect(moreAnchor(2, { items: items(34), hasMore: true, newFrom: 10 })).toBe(10);
  });
  it('none on the first page, last cover when the new page brought nothing', () => {
    expect(moreAnchor(1, { items: items(20), hasMore: true, newFrom: 0 })).toBeUndefined();
    expect(moreAnchor(2, { items: items(10), hasMore: false, newFrom: 10 })).toBe(9);
    expect(moreAnchor(2, { items: [], hasMore: false, newFrom: 0 })).toBeUndefined();
  });
});
