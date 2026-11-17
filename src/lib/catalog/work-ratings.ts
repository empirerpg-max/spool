import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchOmdbRatings } from './omdb';
import { fetchImdbId } from './tmdb-client';
import { refreshRatingsIfDue, todaySaoPaulo, type ExternalRatings, type LobbyRating } from './ratings';
import { supabaseRatingsStore } from './repository';
import type { WorkKind } from './types';

const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Scores for a work page: the Lobby average (members' stars) and, for films and series, IMDb / Rotten Tomatoes.
 * External scores are refreshed from OMDb only when due (at most once every 7 days). Never throws.
 */
export async function getWorkRatings(workId: string | null, kind: WorkKind, externalId?: string): Promise<{ lobby: LobbyRating | null; external: ExternalRatings | null }> {
  if (!workId || !configured()) return { lobby: null, external: null };
  const db = createServiceClient();

  const lobby = (async (): Promise<LobbyRating | null> => {
    const { data, error } = await db.rpc('lobby_rating', { p_work: workId });
    if (error) throw new Error(`Supabase: ${error.message}`);
    const row = (data as Array<{ average: number | string | null; ratings: number }> | null)?.[0];
    return { average: row?.average == null ? null : Number(row.average), count: row?.ratings ?? 0 };
  })().catch((e) => {
    console.error('[ratings] lobby failed', e);
    return null;
  });

  const external = kind === 'book'
    ? Promise.resolve(null)
    : (async () => {
      const store = supabaseRatingsStore(db);
      return refreshRatingsIfDue(workId, {
        today: todaySaoPaulo(), read: store.read, write: store.write, fetchRatings: (id) => fetchOmdbRatings(id),
        ...(externalId && process.env.OMDB_API_KEY?.trim()
          ? { lookupImdbId: () => fetchImdbId(kind, externalId), saveImdbId: store.saveImdbId }
          : {}),
      });
    })().catch((e) => {
      console.error('[ratings] external failed', e);
      return null;
    });

  const [l, x] = await Promise.all([lobby, external]);
  return { lobby: l, external: x };
}
