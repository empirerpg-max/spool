import type { SupabaseClient } from '@supabase/supabase-js';
import type { OmdbRatings } from './omdb';
import type { ExternalRatings } from './ratings';
import type { Availability, AvailabilityType, NormalizedWork, WorkKind } from './types';

export interface WorkRepository {
  find(kind: WorkKind, externalId: string): Promise<{ work: NormalizedWork; id: string; syncedAt: string } | null>;
  save(work: NormalizedWork): Promise<string>;
}

type WorkRow = {
  id: string; kind: WorkKind; external_id: string; title: string; original_title: string | null;
  overview: string | null; overview_lang: NormalizedWork['overviewLang']; poster_url: string | null; backdrop_url: string | null;
  release_date_br: string | null; theatrical_date_br: string | null; digital_date_br: string | null;
  trailer_youtube_key: string | null; people: string[]; isbns: string[]; imdb_id: string | null; synced_at: string;
  availability: Array<{ provider: string; type: AvailabilityType; logo_url: string | null; link: string | null }>;
  seasons: Array<{ number: number; air_date: string | null; episode_count: number }>;
};

function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(`Supabase: ${r.error.message}`);
  return r.data;
}

const availKey = (a: { provider: string; type: string }) => `${a.provider}|${a.type}`;

export function supabaseWorkRepository(client: SupabaseClient): WorkRepository {
  return {
    async find(kind, externalId) {
      const row = check(
        await client.from('works').select('*, availability(*), seasons(*)').eq('kind', kind).eq('external_id', externalId).maybeSingle(),
      ) as WorkRow | null;
      if (!row) return null;
      const work: NormalizedWork = {
        kind: row.kind, externalId: row.external_id, title: row.title, originalTitle: row.original_title,
        overview: row.overview, overviewLang: row.overview_lang, posterUrl: row.poster_url, backdropUrl: row.backdrop_url,
        releaseDateBR: row.release_date_br, theatricalDateBR: row.theatrical_date_br, digitalDateBR: row.digital_date_br,
        trailerYoutubeKey: row.trailer_youtube_key, people: row.people, isbns: row.isbns, imdbId: row.imdb_id ?? null,
        availability: row.availability.map((a): Availability => ({ provider: a.provider, type: a.type, logoUrl: a.logo_url, link: a.link })),
        seasons: [...row.seasons].sort((a, b) => a.number - b.number).map((s) => ({ number: s.number, airDate: s.air_date, episodeCount: s.episode_count })),
      };
      return { work, id: row.id, syncedAt: row.synced_at };
    },

    async save(w) {
      const { id } = check(
        await client.from('works').upsert({
          kind: w.kind, external_id: w.externalId, title: w.title, original_title: w.originalTitle,
          overview: w.overview, overview_lang: w.overviewLang, poster_url: w.posterUrl, backdrop_url: w.backdropUrl,
          release_date_br: w.releaseDateBR, theatrical_date_br: w.theatricalDateBR, digital_date_br: w.digitalDateBR,
          trailer_youtube_key: w.trailerYoutubeKey, people: w.people, isbns: w.isbns, synced_at: new Date().toISOString(),
          // A missing id from TMDB doesn't erase one we already have.
          ...(w.imdbId ? { imdb_id: w.imdbId } : {}),
        }, { onConflict: 'kind,external_id' }).select('id').single(),
      ) as { id: string };

      check(await client.from('seasons').delete().eq('work_id', id));
      if (w.seasons.length) {
        check(await client.from('seasons').insert(w.seasons.map((s) => ({ work_id: id, number: s.number, air_date: s.airDate, episode_count: s.episodeCount }))));
      }

      // Keep first_seen_at of providers that remain: plan 4 uses it to detect "entrou no streaming".
      const existing = check(await client.from('availability').select('provider, type').eq('work_id', id)) as Array<{ provider: string; type: string }>;
      const incoming = new Set(w.availability.map(availKey));
      for (const gone of existing.filter((e) => !incoming.has(availKey(e)))) {
        check(await client.from('availability').delete().eq('work_id', id).eq('provider', gone.provider).eq('type', gone.type));
      }
      if (w.availability.length) {
        check(await client.from('availability').upsert(
          w.availability.map((a) => ({ work_id: id, provider: a.provider, type: a.type, logo_url: a.logoUrl, link: a.link })),
          { onConflict: 'work_id,provider,type', ignoreDuplicates: true },
        ));
      }
      return id;
    },
  };
}

type RatingsRow = {
  imdb_id: string | null; imdb_rating: number | string | null; imdb_votes: number | null; rt_score: number | null; ratings_checked_on: string | null;
};

const num = (v: number | string | null) => (v === null ? null : Number(v));

/** Reads and writes the IMDb / Rotten Tomatoes scores stored on a work (service role). */
export function supabaseRatingsStore(client: SupabaseClient) {
  return {
    async read(workId: string): Promise<ExternalRatings | null> {
      const row = check(
        await client.from('works').select('imdb_id, imdb_rating, imdb_votes, rt_score, ratings_checked_on').eq('id', workId).maybeSingle(),
      ) as RatingsRow | null;
      if (!row) return null;
      return {
        imdbId: row.imdb_id, imdbRating: num(row.imdb_rating), imdbVotes: row.imdb_votes, rtScore: row.rt_score, checkedOn: row.ratings_checked_on,
      };
    },
    async write(workId: string, r: OmdbRatings, today: string): Promise<void> {
      check(await client.from('works').update({
        imdb_rating: r.imdbRating, imdb_votes: r.imdbVotes, rt_score: r.rtScore, ratings_checked_on: today,
      }).eq('id', workId));
    },
  };
}
