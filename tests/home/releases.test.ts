import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  bookCandidates, cachedFetch, loadNowPlaying, loadReleases, nowPlaying, seriesOnAir, tmdbMovies, tmdbSeries, trending, upcoming, bookReleases,
  type ReleaseItem,
} from '@/lib/home/releases';
import { workPath } from '@/lib/catalog/kind';
import { fakeFetch } from '../catalog/clients.helpers';

beforeEach(() => { process.env.TMDB_API_READ_TOKEN = 'test-token'; });

const movie = (id: number, extra: Record<string, unknown> = {}) => ({
  id, title: `Filme ${id}`, poster_path: `/p${id}.jpg`, release_date: '2026-11-10', popularity: id, ...extra,
});
const show = (id: number, extra: Record<string, unknown> = {}) => ({
  id, name: `Série ${id}`, poster_path: `/s${id}.jpg`, first_air_date: '2026-10-01', popularity: id, ...extra,
});
const volume = (title: string, publishedDate: string, extra: Record<string, unknown> = {}) => ({
  volumeInfo: {
    title, publishedDate, authors: ['Autora'], imageLinks: { thumbnail: 'http://books.google.com/x?id=1&zoom=5' },
    industryIdentifiers: [{ type: 'ISBN_13', identifier: `978${title.length}` }], ...extra,
  },
});

describe('tmdbMovies', () => {
  it('turns a TMDB list into release items with a small poster and skips items without poster', () => {
    const items = tmdbMovies({ results: [movie(1), movie(2, { poster_path: null })] });
    expect(items).toEqual([{
      kind: 'movie', externalId: '1', title: 'Filme 1', posterUrl: 'https://image.tmdb.org/t/p/w342/p1.jpg', date: '2026-11-10', popularity: 1,
    }]);
  });

  it('copes with a broken answer', () => {
    expect(tmdbMovies(null)).toEqual([]);
    expect(tmdbMovies({ results: 'x' })).toEqual([]);
  });
});

describe('tmdbSeries', () => {
  it('sorts by popularity, keeps the top 20 and skips items without poster', () => {
    const results = [...Array.from({ length: 25 }, (_, i) => show(i + 1)), show(99, { poster_path: null })];
    const items = tmdbSeries({ results });
    expect(items).toHaveLength(20);
    expect(items[0]).toMatchObject({ kind: 'series', externalId: '25', title: 'Série 25', date: '2026-10-01' });
    expect(items.map((i) => i.externalId)).not.toContain('99');
  });
});

describe('bookCandidates', () => {
  const today = '2026-11-16';
  it('keeps recent books with cover, newest first, deduped by title', () => {
    const json = {
      items: [
        volume('Torto Arado', '2026-09'),
        volume('Torto  arado', '2026-10-01'),
        volume('Velho', '2020-01-01'),
        volume('Futuro', '2027-03-01'),
        volume('Sem capa', '2026-10-01', { imageLinks: undefined }),
        volume('Só ano', '2026'),
      ],
    };
    const c = bookCandidates(json, today);
    expect(c.map((b) => b.title)).toEqual(['Torto Arado']);
    expect(c[0]).toMatchObject({ date: '2026-09-01', author: 'Autora', isbn: '97811', posterUrl: 'https://books.google.com/x?id=1&zoom=1' });
  });
});

describe('fetching', () => {
  it('now playing asks TMDB for Brazilian theatres in Portuguese and labels items', async () => {
    const f = fakeFetch([{ match: /\/movie\/now_playing\?/, body: { results: [movie(1)] } }]);
    const items = await nowPlaying(f);
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain('region=BR');
    expect(url).toContain('language=pt-BR');
    expect(items[0]).toMatchObject({ externalId: '1', label: 'Nos cinemas' });
  });

  it('upcoming keeps only films that open after today', async () => {
    const f = fakeFetch([{ match: /\/movie\/upcoming\?/, body: { results: [movie(1, { release_date: '2026-11-16' }), movie(2, { release_date: '2026-12-01' }), movie(3, { release_date: null })] } }]);
    const items = await upcoming('2026-11-16', f);
    expect(items.map((i) => i.externalId)).toEqual(['2']);
    expect(items[0].label).toBe('Em breve');
  });

  it('series on the air come from TMDB in Portuguese', async () => {
    const f = fakeFetch([{ match: /\/tv\/on_the_air\?/, body: { results: [show(1)] } }]);
    const items = await seriesOnAir(f);
    expect(String(f.mock.calls[0][0])).toContain('language=pt-BR');
    expect(items[0]).toMatchObject({ kind: 'series', externalId: '1' });
  });

  it('book releases are matched to the Open Library work that the book page uses', async () => {
    const f = fakeFetch([
      { match: /googleapis\.com\/books\/v1\/volumes\?/, body: { items: [volume('Livro A', '2026-10-01'), volume('Livro BB', '2026-10-02'), volume('Livro CCC', '2026-10-03')] } },
      // ISBNs in the fixture are "978" + title length: A → 9787, BB → 9788, CCC → 9789.
      { match: /openlibrary\.org\/isbn\/9788\.json/, body: { works: [{ key: '/works/OL10W' }] } },
      { match: /openlibrary\.org\/isbn\/9787\.json/, status: 404 },
      { match: /openlibrary\.org\/search\.json\?.*Livro\+A/, body: { docs: [{ key: '/works/OL1W' }] } },
      { match: /openlibrary\.org\/isbn\/9789\.json/, error: new Error('down') },
    ]);
    const items = await bookReleases('2026-11-16', f);
    const gUrl = String(f.mock.calls[0][0]);
    expect(gUrl).toContain('langRestrict=pt');
    expect(gUrl).toContain('orderBy=newest');
    expect(items.map((i) => [i.title, i.externalId])).toEqual([['Livro BB', 'OL10W'], ['Livro A', 'OL1W']]);
    expect(workPath(items[0].kind, items[0].externalId)).toBe('/obra/livro/OL10W');
  });

  it('when Google Books refuses (daily limit), books come from Open Library recent Portuguese fiction', async () => {
    const f = fakeFetch([
      { match: /googleapis\.com/, status: 429 },
      { match: /openlibrary\.org\/search\.json\?.*language%3Apor/, body: { docs: [
        { key: '/works/OL5W', title: 'Com capa', first_publish_year: 2026, cover_i: 42 },
        { key: '/works/OL6W', title: 'Sem capa', first_publish_year: 2026 },
        { key: '/works/OL5W', title: 'Repetido', first_publish_year: 2026, cover_i: 43 },
      ] } },
    ]);
    const items = await bookReleases('2026-11-16', f);
    expect(items.map((i) => [i.title, i.externalId, i.posterUrl])).toEqual([
      ['Com capa', 'OL5W', 'https://covers.openlibrary.org/b/id/42-M.jpg'],
    ]);
  });

  it('a TMDB failure is reported as an error for that row', async () => {
    const f = fakeFetch([{ match: /now_playing/, status: 500 }]);
    await expect(nowPlaying(f)).rejects.toThrow();
  });
});

describe('loadReleases', () => {
  it('each source fails on its own: the others still load', async () => {
    const f = fakeFetch([
      { match: /now_playing/, body: { results: [movie(1)] } },
      { match: /upcoming/, status: 500 },
      { match: /on_the_air/, error: new Error('offline') },
      { match: /googleapis/, status: 503 },
    ]);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await loadReleases('2026-11-16', f);
    spy.mockRestore();
    expect(r.nowPlaying?.map((i) => i.externalId)).toEqual(['1']);
    expect(r.upcoming).toBeNull();
    expect(r.series).toBeNull();
    expect(r.books).toBeNull();
  });
});

describe('loadNowPlaying', () => {
  it('gives null instead of failing the signed-out home', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadNowPlaying(fakeFetch([{ match: /now_playing/, status: 500 }]))).toBeNull();
    spy.mockRestore();
    expect(await loadNowPlaying(fakeFetch([{ match: /now_playing/, body: { results: [movie(7)] } }]))).toHaveLength(1);
  });
});

describe('cachedFetch', () => {
  it('adds a revalidate time to every request, keeping the caller options', async () => {
    const base = vi.fn(async () => new Response('{}'));
    await cachedFetch(3600, base as unknown as typeof fetch)('https://x.test', { headers: { a: 'b' } });
    expect(base).toHaveBeenCalledWith('https://x.test', { headers: { a: 'b' }, next: { revalidate: 3600 } });
  });
});

describe('trending', () => {
  const item = (kind: ReleaseItem['kind'], id: string, popularity: number): ReleaseItem =>
    ({ kind, externalId: id, title: id, posterUrl: 'x', date: null, popularity });

  it('mixes about 3 films, 3 series and 2 books, most popular first within each kind', () => {
    const t = trending({
      nowPlaying: [item('movie', 'm1', 10), item('movie', 'm2', 50)],
      upcoming: [item('movie', 'm3', 30), item('movie', 'm4', 5), item('movie', 'm2', 50)],
      series: [item('series', 's1', 1), item('series', 's2', 2), item('series', 's3', 3), item('series', 's4', 4)],
      books: [item('book', 'b1', 0), item('book', 'b2', 0), item('book', 'b3', 0)],
    });
    expect(t.map((i) => i.externalId)).toEqual(['m2', 's4', 'b1', 'm3', 's3', 'b2', 'm1', 's2']);
  });

  it('fills the gaps with other kinds when a source is missing', () => {
    const t = trending({
      nowPlaying: Array.from({ length: 10 }, (_, i) => item('movie', `m${i}`, i)),
      upcoming: null, series: null, books: null,
    });
    expect(t).toHaveLength(8);
    expect(t[0].externalId).toBe('m9');
  });

  it('is empty when everything failed', () => {
    expect(trending({ nowPlaying: null, upcoming: null, series: null, books: null })).toEqual([]);
  });
});
