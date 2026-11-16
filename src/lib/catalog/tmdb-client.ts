import { getJson, type FetchImpl } from './http';
import { normalizeTmdbMovie, normalizeTmdbSearch, normalizeTmdbTv } from './tmdb-normalize';
import type { NormalizedWork, SearchHit } from './types';

const BASE = 'https://api.themoviedb.org/3';

function headers(): Record<string, string> {
  return { Authorization: `Bearer ${process.env.TMDB_API_READ_TOKEN ?? ''}`, Accept: 'application/json' };
}

function url(path: string, params: Record<string, string>): string {
  return `${BASE}${path}?${new URLSearchParams(params)}`;
}

export async function fetchTmdbWork(kind: 'movie' | 'series', id: string, fetchImpl: FetchImpl = fetch): Promise<NormalizedWork> {
  const path = kind === 'movie' ? `/movie/${id}` : `/tv/${id}`;
  const append = kind === 'movie' ? 'videos,credits,watch/providers,release_dates' : 'videos,aggregate_credits,watch/providers';
  const pt = (await getJson(
    url(path, { language: 'pt-BR', append_to_response: append, include_video_language: 'pt,en,null' }),
    'tmdb', headers(), fetchImpl,
  )) as { overview?: string };

  let enOverview: string | null = null;
  if (!pt?.overview?.trim()) {
    const en = (await getJson(url(path, { language: 'en-US' }), 'tmdb', headers(), fetchImpl)) as { overview?: string };
    enOverview = en?.overview ?? null;
  }
  return kind === 'movie' ? normalizeTmdbMovie(pt, enOverview) : normalizeTmdbTv(pt, enOverview);
}

export async function searchTmdb(query: string, fetchImpl: FetchImpl = fetch): Promise<SearchHit[]> {
  const json = await getJson(
    url('/search/multi', { query, language: 'pt-BR', region: 'BR', include_adult: 'false' }),
    'tmdb', headers(), fetchImpl,
  );
  return normalizeTmdbSearch(json);
}

/** Movie-only search, optionally pinned to a release year (used to match imported films). */
export async function searchTmdbMovie(title: string, year: number | null, fetchImpl: FetchImpl = fetch): Promise<SearchHit[]> {
  const params: Record<string, string> = { query: title, language: 'pt-BR', include_adult: 'false' };
  if (year) params.year = String(year);
  const json = (await getJson(url('/search/movie', params), 'tmdb', headers(), fetchImpl)) as { results?: unknown[] };
  return normalizeTmdbSearch({ results: (json?.results ?? []).map((r) => ({ ...(r as object), media_type: 'movie' })) });
}

/** A TMDB list endpoint (e.g. `/movie/now_playing`) in Portuguese, as raw JSON. */
export async function fetchTmdbList(path: string, params: Record<string, string>, fetchImpl: FetchImpl = fetch): Promise<unknown> {
  return getJson(url(path, { language: 'pt-BR', ...params }), 'tmdb', headers(), fetchImpl);
}
