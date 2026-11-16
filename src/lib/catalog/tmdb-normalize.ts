import { IMDB_ID } from './omdb';
import type { Availability, AvailabilityType, NormalizedWork, SearchHit, Season } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

const PROVIDER_TYPES: Array<[string, AvailabilityType]> = [
  ['flatrate', 'subscription'],
  ['free', 'free'],
  ['ads', 'ads'],
  ['rent', 'rent'],
  ['buy', 'buy'],
];

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const arr = (v: unknown): Json[] => (Array.isArray(v) ? v : []);
const poster = (path: unknown) => (str(path) ? `${POSTER_BASE}${path}` : null);
const backdrop = (path: unknown) => (str(path) ? `${BACKDROP_BASE}${path}` : null);
const yearOf = (date: unknown) => (str(date) ? Number(String(date).slice(0, 4)) || null : null);

function availabilityBR(json: Json): Availability[] {
  const br = json?.['watch/providers']?.results?.BR;
  if (!br) return [];
  const link = str(br.link);
  const seen = new Set<string>();
  const out: Availability[] = [];
  for (const [key, type] of PROVIDER_TYPES) {
    for (const p of arr(br[key])) {
      const provider = str(p?.provider_name);
      if (!provider || seen.has(`${provider}|${type}`)) continue;
      seen.add(`${provider}|${type}`);
      out.push({ provider, type, link, logoUrl: str(p.logo_path) ? `${LOGO_BASE}${p.logo_path}` : null });
    }
  }
  return out;
}

function trailerKey(json: Json): string | null {
  const trailers = arr(json?.videos?.results).filter((v) => v?.site === 'YouTube' && v?.type === 'Trailer' && str(v?.key));
  const pick = trailers.find((v) => v.iso_639_1 === 'pt') ?? trailers[0];
  return pick ? pick.key : null;
}

function overviewOf(json: Json, enOverview: string | null): Pick<NormalizedWork, 'overview' | 'overviewLang'> {
  const pt = str(json?.overview);
  if (pt) return { overview: pt, overviewLang: 'pt-BR' };
  const en = str(enOverview);
  if (en) return { overview: en, overviewLang: 'en' };
  return { overview: null, overviewLang: null };
}

function earliestBR(json: Json, types: number[]): string | null {
  const br = arr(json?.release_dates?.results).find((r) => r?.iso_3166_1 === 'BR');
  const dates = arr(br?.release_dates)
    .filter((d) => types.includes(d?.type) && str(d?.release_date))
    .map((d) => String(d.release_date).slice(0, 10))
    .sort();
  return dates[0] ?? null;
}

const imdbIdOf = (j: Json): string | null =>
  [j?.imdb_id, j?.external_ids?.imdb_id].find((v): v is string => typeof v === 'string' && IMDB_ID.test(v)) ?? null;

const names = (cast: unknown) => arr(cast).map((c) => str(c?.name)).filter((n): n is string => !!n).slice(0, 5);

function distinct(original: string | null, title: string): string | null {
  return original && original !== title ? original : null;
}

export function normalizeTmdbMovie(ptBr: unknown, enOverview: string | null): NormalizedWork {
  const j = ptBr as Json;
  const title = str(j?.title) ?? str(j?.original_title) ?? 'Sem título';
  const theatricalDateBR = earliestBR(j, [2, 3]);
  return {
    kind: 'movie',
    externalId: String(j?.id),
    title,
    originalTitle: distinct(str(j?.original_title), title),
    ...overviewOf(j, enOverview),
    posterUrl: poster(j?.poster_path),
    backdropUrl: backdrop(j?.backdrop_path),
    releaseDateBR: theatricalDateBR ?? str(j?.release_date),
    theatricalDateBR,
    digitalDateBR: earliestBR(j, [4]),
    trailerYoutubeKey: trailerKey(j),
    people: names(j?.credits?.cast),
    availability: availabilityBR(j),
    seasons: [],
    isbns: [],
    imdbId: imdbIdOf(j),
  };
}

export function normalizeTmdbTv(ptBr: unknown, enOverview: string | null): NormalizedWork {
  const j = ptBr as Json;
  const title = str(j?.name) ?? str(j?.original_name) ?? 'Sem título';
  const seasons: Season[] = arr(j?.seasons)
    .filter((s) => typeof s?.season_number === 'number' && s.season_number !== 0)
    .map((s) => ({ number: s.season_number, airDate: str(s.air_date), episodeCount: Number(s.episode_count) || 0 }));
  return {
    kind: 'series',
    externalId: String(j?.id),
    title,
    originalTitle: distinct(str(j?.original_name), title),
    ...overviewOf(j, enOverview),
    posterUrl: poster(j?.poster_path),
    backdropUrl: backdrop(j?.backdrop_path),
    releaseDateBR: str(j?.first_air_date),
    theatricalDateBR: null,
    digitalDateBR: null,
    trailerYoutubeKey: trailerKey(j),
    people: names(j?.aggregate_credits?.cast),
    availability: availabilityBR(j),
    seasons,
    isbns: [],
    imdbId: imdbIdOf(j),
  };
}

export function normalizeTmdbSearch(json: unknown): SearchHit[] {
  return arr((json as Json)?.results).flatMap((r): SearchHit[] => {
    if (r?.media_type === 'movie') {
      return [{ kind: 'movie', externalId: String(r.id), title: str(r.title) ?? 'Sem título', year: yearOf(r.release_date), posterUrl: poster(r.poster_path) }];
    }
    if (r?.media_type === 'tv') {
      return [{ kind: 'series', externalId: String(r.id), title: str(r.name) ?? 'Sem título', year: yearOf(r.first_air_date), posterUrl: poster(r.poster_path) }];
    }
    return [];
  });
}
