import { describe, it, expect } from 'vitest';
import movie603 from '../fixtures/tmdb-movie-603.json';
import movieNoBr from '../fixtures/tmdb-movie-no-br.json';
import tv1399 from '../fixtures/tmdb-tv-1399.json';
import searchMulti from '../fixtures/tmdb-search-multi.json';
import { normalizeTmdbMovie, normalizeTmdbTv, normalizeTmdbSearch } from '@/lib/catalog/tmdb-normalize';

describe('normalizeTmdbMovie', () => {
  it('movie 603 maps title, poster, BR providers and trailer', () => {
    const w = normalizeTmdbMovie(movie603, null);
    expect(w.kind).toBe('movie');
    expect(w.externalId).toBe('603');
    expect(w.title).toBe('Matrix');
    expect(w.originalTitle).toBe('The Matrix');
    expect(w.posterUrl).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\//);
    expect(w.availability).toContainEqual(
      expect.objectContaining({ provider: 'Max', type: 'subscription', logoUrl: 'https://image.tmdb.org/t/p/w92/max.jpg' }),
    );
    expect(w.availability.filter((a) => a.provider === 'Apple TV' && a.type === 'rent')).toHaveLength(1);
    expect(w.availability.every((a) => a.provider !== 'Netflix')).toBe(true);
    expect(w.trailerYoutubeKey).toBe('pttrailer');
    expect(w.people).toHaveLength(5);
    expect(w.seasons).toEqual([]);
  });

  it('maps the backdrop image', () => {
    expect(normalizeTmdbMovie(movie603, null).backdropUrl).toBe('https://image.tmdb.org/t/p/w1280/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg');
    expect(normalizeTmdbTv(tv1399, null).backdropUrl).toBe('https://image.tmdb.org/t/p/w1280/got-bd.jpg');
    expect(normalizeTmdbMovie(movieNoBr, null).backdropUrl).toBeNull();
  });

  it('uses earliest BR theatrical (type 2/3) and digital (type 4) dates', () => {
    const w = normalizeTmdbMovie(movie603, null);
    expect(w.theatricalDateBR).toBe('1999-05-14');
    expect(w.digitalDateBR).toBe('2000-01-10');
    expect(w.releaseDateBR).toBe('1999-05-14');
  });

  it('movie without BR providers has empty availability', () => {
    const w = normalizeTmdbMovie(movieNoBr, null);
    expect(w.availability).toEqual([]);
    expect(w.posterUrl).toBeNull();
    expect(w.trailerYoutubeKey).toBeNull();
    expect(w.releaseDateBR).toBe('2024-02-02');
  });

  it('falls back to English overview', () => {
    const w = normalizeTmdbMovie(movieNoBr, 'A hacker...');
    expect(w.overview).toBe('A hacker...');
    expect(w.overviewLang).toBe('en');
    const none = normalizeTmdbMovie(movieNoBr, null);
    expect(none.overview).toBeNull();
    expect(none.overviewLang).toBeNull();
  });

  it('captures the IMDb id from the details or external ids, ignoring anything else', () => {
    expect(normalizeTmdbMovie({ ...movie603, imdb_id: 'tt0133093' }, null).imdbId).toBe('tt0133093');
    expect(normalizeTmdbMovie({ ...movie603, imdb_id: null, external_ids: { imdb_id: 'tt0133093' } }, null).imdbId).toBe('tt0133093');
    expect(normalizeTmdbMovie({ ...movie603, imdb_id: '' }, null).imdbId).toBeNull();
    expect(normalizeTmdbMovie({ ...movie603, imdb_id: 'x&apikey=1' }, null).imdbId).toBeNull();
    expect(normalizeTmdbMovie(movieNoBr, null).imdbId).toBeNull();
  });

  it('keeps Portuguese overview when present', () => {
    const w = normalizeTmdbMovie(movie603, 'ignored');
    expect(w.overviewLang).toBe('pt-BR');
  });
});

describe('normalizeTmdbTv', () => {
  it('captures the IMDb id from external ids', () => {
    expect(normalizeTmdbTv({ ...tv1399, external_ids: { imdb_id: 'tt0944947' } }, null).imdbId).toBe('tt0944947');
    expect(normalizeTmdbTv(tv1399, null).imdbId).toBeNull();
  });

  it('tv 1399 maps seasons without specials', () => {
    const w = normalizeTmdbTv(tv1399, null);
    expect(w.kind).toBe('series');
    expect(w.title).toBe('Game of Thrones');
    expect(w.originalTitle).toBeNull();
    expect(w.seasons.some((s) => s.number === 0)).toBe(false);
    expect(w.seasons[0]).toEqual({ number: 1, airDate: '2011-04-17', episodeCount: 10 });
    expect(w.seasons[1].airDate).toBeNull();
    expect(w.releaseDateBR).toBe('2011-04-17');
    expect(w.trailerYoutubeKey).toBe('gottrailer');
    expect(w.availability.map((a) => a.type).sort()).toEqual(['ads', 'free', 'subscription']);
    expect(w.theatricalDateBR).toBeNull();
  });
});

describe('normalizeTmdbSearch', () => {
  it('search keeps only movies and series', () => {
    const hits = normalizeTmdbSearch(searchMulti);
    expect(hits.map((h) => h.kind)).toEqual(['movie', 'series', 'movie']);
    expect(hits[0]).toEqual({ kind: 'movie', externalId: '603', title: 'Matrix', year: 1999, posterUrl: 'https://image.tmdb.org/t/p/w500/p96.jpg' });
    expect(hits[1].year).toBe(2011);
    expect(hits[1].posterUrl).toBeNull();
    expect(hits[2].year).toBeNull();
  });

  it('returns empty array for malformed input', () => {
    expect(normalizeTmdbSearch({})).toEqual([]);
  });
});
