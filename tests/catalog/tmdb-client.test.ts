import { describe, it, expect, beforeEach } from 'vitest';
import movie603 from '../fixtures/tmdb-movie-603.json';
import tv1399 from '../fixtures/tmdb-tv-1399.json';
import searchMulti from '../fixtures/tmdb-search-multi.json';
import { fetchTmdbWork, searchTmdb } from '@/lib/catalog/tmdb-client';
import { CatalogUnavailableError, WorkNotFoundError } from '@/lib/catalog/errors';
import { fakeFetch } from './clients.helpers';

beforeEach(() => { process.env.TMDB_API_READ_TOKEN = 'test-token'; });

describe('fetchTmdbWork', () => {
  it('returns normalized movie with one call when Portuguese overview present', async () => {
    const f = fakeFetch([{ match: /\/movie\/603\?/, body: movie603 }]);
    const w = await fetchTmdbWork('movie', '603', f);
    expect(w.title).toBe('Matrix');
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('language=pt-BR');
    expect(url).toContain('append_to_response=videos%2Ccredits%2Cwatch%2Fproviders%2Crelease_dates');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('fetches English overview when Portuguese is empty', async () => {
    const f = fakeFetch([
      { match: /language=pt-BR/, body: { ...movie603, overview: '' } },
      { match: /language=en-US/, body: { overview: 'A hacker learns the truth.' } },
    ]);
    const w = await fetchTmdbWork('movie', '603', f);
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[1][0])).toContain('language=en-US');
    expect(w.overview).toBe('A hacker learns the truth.');
    expect(w.overviewLang).toBe('en');
  });

  it('series uses tv endpoint with aggregate credits', async () => {
    const f = fakeFetch([{ match: /\/tv\/1399\?/, body: tv1399 }]);
    const w = await fetchTmdbWork('series', '1399', f);
    expect(w.kind).toBe('series');
    expect(String(f.mock.calls[0][0])).toContain('aggregate_credits');
  });

  it('404 throws WorkNotFoundError', async () => {
    const f = fakeFetch([{ match: /movie\/1/, status: 404 }]);
    await expect(fetchTmdbWork('movie', '1', f)).rejects.toBeInstanceOf(WorkNotFoundError);
  });

  it('429 retries once then succeeds', async () => {
    const f = fakeFetch([
      { match: /movie\/603/, status: 429, headers: { 'Retry-After': '0' } },
      { match: /movie\/603/, body: movie603 },
    ]);
    await expect(fetchTmdbWork('movie', '603', f)).resolves.toMatchObject({ title: 'Matrix' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('429 twice throws CatalogUnavailableError', async () => {
    const f = fakeFetch([
      { match: /movie\/603/, status: 429, headers: { 'Retry-After': '0' } },
      { match: /movie\/603/, status: 429, headers: { 'Retry-After': '0' } },
    ]);
    await expect(fetchTmdbWork('movie', '603', f)).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  it('500 throws CatalogUnavailableError with source tmdb', async () => {
    const f = fakeFetch([{ match: /movie\/603/, status: 500 }]);
    await expect(fetchTmdbWork('movie', '603', f)).rejects.toMatchObject({ name: 'CatalogUnavailableError', source: 'tmdb' });
  });

  it('network error throws CatalogUnavailableError', async () => {
    const f = fakeFetch([{ match: /movie\/603/, error: new TypeError('fetch failed') }]);
    await expect(fetchTmdbWork('movie', '603', f)).rejects.toBeInstanceOf(CatalogUnavailableError);
  });
});

describe('searchTmdb', () => {
  it('calls search/multi in pt-BR for Brazil and normalizes', async () => {
    const f = fakeFetch([{ match: /search\/multi/, body: searchMulti }]);
    const hits = await searchTmdb('matrix', f);
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain('query=matrix');
    expect(url).toContain('region=BR');
    expect(url).toContain('include_adult=false');
    expect(hits[0].title).toBe('Matrix');
  });
});
