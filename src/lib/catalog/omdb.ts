import type { FetchImpl } from './http';

/** Scores OMDb gives for a film or series; null when it has none. */
export type OmdbRatings = { imdbRating: number | null; imdbVotes: number | null; rtScore: number | null };

const BASE = 'https://www.omdbapi.com/';
const TIMEOUT_MS = 5000;
export const IMDB_ID = /^tt\d{5,12}$/;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const NONE: OmdbRatings = { imdbRating: null, imdbVotes: null, rtScore: null };

function imdbRating(v: unknown): number | null {
  if (typeof v !== 'string' || !/^\d{1,2}(\.\d)?$/.test(v)) return null;
  const n = Number(v);
  return n >= 0 && n <= 10 ? n : null;
}

function imdbVotes(v: unknown): number | null {
  if (typeof v !== 'string' || !/^\d{1,3}(,\d{3})*$|^\d+$/.test(v)) return null;
  const n = Number(v.replaceAll(',', ''));
  return Number.isSafeInteger(n) && n <= 2_147_483_647 ? n : null;
}

function rtScore(ratings: unknown): number | null {
  if (!Array.isArray(ratings)) return null;
  const rt = ratings.find((r: Json) => r?.Source === 'Rotten Tomatoes');
  const m = typeof rt?.Value === 'string' ? /^(\d{1,3})%$/.exec(rt.Value) : null;
  const n = m ? Number(m[1]) : NaN;
  return n >= 0 && n <= 100 ? n : null;
}

/** Pure: OMDb's JSON → scores. "N/A", missing or odd values become null. */
export function parseOmdb(json: unknown): OmdbRatings {
  const j = json as Json;
  if (!j || typeof j !== 'object' || j.Response === 'False') return { ...NONE };
  return { imdbRating: imdbRating(j.imdbRating), imdbVotes: imdbVotes(j.imdbVotes), rtScore: rtScore(j.Ratings) };
}

export const omdbConfigured = () => Boolean(process.env.OMDB_API_KEY?.trim());

/**
 * Asks OMDb for the scores of an IMDb title. Null when there is no key (nothing is called), the id is not an
 * IMDb id, or OMDb can't be reached / refuses (limit, bad key): the caller keeps the old scores and tries later.
 * Never throws and never logs the request URL (it carries the key).
 */
export async function fetchOmdbRatings(imdbId: string, fetchImpl: FetchImpl = fetch): Promise<OmdbRatings | null> {
  const key = process.env.OMDB_API_KEY?.trim();
  if (!key || !IMDB_ID.test(imdbId)) return null;
  const url = `${BASE}?${new URLSearchParams({ i: imdbId, apikey: key })}`;
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      console.error(`[omdb] respondeu ${res.status} para ${imdbId}`);
      return null;
    }
    return parseOmdb(await res.json());
  } catch (e) {
    console.error(`[omdb] falhou para ${imdbId}:`, e instanceof Error ? e.name : 'erro');
    return null;
  }
}

export type OmdbCheck =
  | { status: 'sem_chave' }
  | { status: 'ok'; imdbRating: number | null; rtScore: number | null }
  | { status: 'recusada'; message: string | null }
  | { status: 'fora_do_ar' };

/** Admin diagnostic: asks OMDb about The Matrix and says, in plain terms, whether the key works. */
export async function checkOmdb(fetchImpl: FetchImpl = fetch): Promise<OmdbCheck> {
  const key = process.env.OMDB_API_KEY?.trim();
  if (!key) return { status: 'sem_chave' };
  try {
    const res = await fetchImpl(`${BASE}?${new URLSearchParams({ i: 'tt0133093', apikey: key })}`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as Json;
    if (!res.ok || body?.Response === 'False') {
      return { status: 'recusada', message: typeof body?.Error === 'string' ? body.Error.slice(0, 120) : null };
    }
    const r = parseOmdb(body);
    return { status: 'ok', imdbRating: r.imdbRating, rtScore: r.rtScore };
  } catch {
    return { status: 'fora_do_ar' };
  }
}
