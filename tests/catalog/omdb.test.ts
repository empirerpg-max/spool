import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkOmdb, fetchOmdbRatings, parseOmdb } from '@/lib/catalog/omdb';
import { fakeFetch } from './clients.helpers';

const matrix = {
  Title: 'The Matrix', imdbID: 'tt0133093', imdbRating: '8.7', imdbVotes: '2,123,456', Response: 'True',
  Ratings: [
    { Source: 'Internet Movie Database', Value: '8.7/10' },
    { Source: 'Rotten Tomatoes', Value: '83%' },
    { Source: 'Metacritic', Value: '73/100' },
  ],
};

describe('parseOmdb', () => {
  it('reads IMDb rating, votes with thousands separators and Rotten Tomatoes', () => {
    expect(parseOmdb(matrix)).toEqual({ imdbRating: 8.7, imdbVotes: 2123456, rtScore: 83 });
  });

  it('"N/A" and missing Rotten Tomatoes become null', () => {
    expect(parseOmdb({ ...matrix, imdbRating: 'N/A', imdbVotes: 'N/A', Ratings: [] })).toEqual({ imdbRating: null, imdbVotes: null, rtScore: null });
    expect(parseOmdb({ imdbRating: '6.1', Response: 'True' })).toEqual({ imdbRating: 6.1, imdbVotes: null, rtScore: null });
  });

  it('a title OMDb does not know means no scores', () => {
    expect(parseOmdb({ Response: 'False', Error: 'Incorrect IMDb ID.' })).toEqual({ imdbRating: null, imdbVotes: null, rtScore: null });
  });

  it('ignores garbage and out-of-range values', () => {
    expect(parseOmdb(null)).toEqual({ imdbRating: null, imdbVotes: null, rtScore: null });
    expect(parseOmdb({ imdbRating: '11', imdbVotes: 'lots', Ratings: [{ Source: 'Rotten Tomatoes', Value: '140%' }] }))
      .toEqual({ imdbRating: null, imdbVotes: null, rtScore: null });
    expect(parseOmdb({ Ratings: 'x' })).toEqual({ imdbRating: null, imdbVotes: null, rtScore: null });
  });
});

describe('fetchOmdbRatings', () => {
  const saved = process.env.OMDB_API_KEY;
  beforeEach(() => { process.env.OMDB_API_KEY = 'secret-key'; });
  afterEach(() => {
    if (saved === undefined) delete process.env.OMDB_API_KEY; else process.env.OMDB_API_KEY = saved;
    vi.restoreAllMocks();
  });

  it('asks OMDb by IMDb id, with a timeout', async () => {
    const f = fakeFetch([{ match: /omdbapi\.com/, body: matrix }]);
    expect(await fetchOmdbRatings('tt0133093', f)).toEqual({ imdbRating: 8.7, imdbVotes: 2123456, rtScore: 83 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    const u = new URL(url);
    expect(u.origin).toBe('https://www.omdbapi.com');
    expect(u.searchParams.get('i')).toBe('tt0133093');
    expect(u.searchParams.get('apikey')).toBe('secret-key');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('without a key never calls OMDb', async () => {
    delete process.env.OMDB_API_KEY;
    const f = fakeFetch([]);
    expect(await fetchOmdbRatings('tt0133093', f)).toBeNull();
    process.env.OMDB_API_KEY = '   ';
    expect(await fetchOmdbRatings('tt0133093', f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('never calls OMDb with something that is not an IMDb id', async () => {
    const f = fakeFetch([]);
    expect(await fetchOmdbRatings('tt0133093&apikey=x', f)).toBeNull();
    expect(await fetchOmdbRatings('', f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('network errors, bad answers and limits return null without leaking the key', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = fakeFetch([
      { match: /omdbapi/, error: new TypeError('fetch failed') },
      { match: /omdbapi/, status: 401, body: { Response: 'False', Error: 'Request limit reached!' } },
      { match: /omdbapi/, status: 500 },
    ]);
    expect(await fetchOmdbRatings('tt0133093', f)).toBeNull();
    expect(await fetchOmdbRatings('tt0133093', f)).toBeNull();
    expect(await fetchOmdbRatings('tt0133093', f)).toBeNull();
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret-key');
  });

  it('an invalid JSON body returns null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = vi.fn(async () => new Response('not json', { status: 200 }));
    expect(await fetchOmdbRatings('tt0133093', f)).toBeNull();
  });
});

describe('checkOmdb (admin diagnostic)', () => {
  const res = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
  afterEach(() => { delete process.env.OMDB_API_KEY; });

  it('no key', async () => {
    delete process.env.OMDB_API_KEY;
    expect(await checkOmdb(res(200, {}))).toEqual({ status: 'sem_chave' });
  });
  it('working', async () => {
    process.env.OMDB_API_KEY = 'k';
    expect(await checkOmdb(res(200, { Response: 'True', imdbRating: '8.7', Ratings: [{ Source: 'Rotten Tomatoes', Value: '83%' }] })))
      .toEqual({ status: 'ok', imdbRating: 8.7, rtScore: 83 });
  });
  it('refused key keeps OMDb message', async () => {
    process.env.OMDB_API_KEY = 'k';
    expect(await checkOmdb(res(401, { Response: 'False', Error: 'Invalid API key!' }))).toEqual({ status: 'recusada', message: 'Invalid API key!' });
  });
  it('unreachable', async () => {
    process.env.OMDB_API_KEY = 'k';
    expect(await checkOmdb(vi.fn(async () => { throw new Error('x'); }))).toEqual({ status: 'fora_do_ar' });
  });
});
