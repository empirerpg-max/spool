import type { AvailabilityType, NormalizedWork } from '@/lib/catalog/types';

export type EventKind = 'cinema' | 'streaming' | 'temporada_anunciada' | 'temporada_estreia' | 'livro_lancado';
export type DetectedEvent = { kind: EventKind; key: string; title: string; body: string | null; url: string };

const STREAMING: AvailabilityType[] = ['subscription', 'free', 'ads'];
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const streamingProviders = (w: NormalizedWork) =>
  new Set(w.availability.filter((a) => STREAMING.includes(a.type)).map((a) => a.provider));

/**
 * What changed between yesterday's copy of a work and today's.
 * With no previous copy (first check) only date-based events fire, so nothing that was
 * already true when the work entered the Lobby turns into a false "news" alert.
 */
export function detectEvents(input: { workId: string; path: string; before: NormalizedWork | null; after: NormalizedWork; today: string }): DetectedEvent[] {
  const { workId, path, before, after, today } = input;
  const out: DetectedEvent[] = [];
  const ev = (kind: EventKind, key: string, title: string) => out.push({ kind, key, title, body: null, url: path });

  if (after.kind === 'movie' && after.theatricalDateBR === today) {
    ev('cinema', `cinema:${workId}`, `${after.title} estreou nos cinemas`);
  }

  if (before) {
    const had = streamingProviders(before);
    for (const provider of streamingProviders(after)) {
      if (!had.has(provider)) ev('streaming', `streaming:${workId}:${provider}:${today}`, `${after.title} chegou na ${provider}`);
    }
  }

  if (after.kind === 'series') {
    for (const s of after.seasons) {
      if (!s.airDate) continue;
      if (s.airDate === today) {
        ev('temporada_estreia', `temporada_estreia:${workId}:${s.number}`, `${after.title}: temporada ${s.number} estreou`);
      } else if (before && s.airDate > today) {
        const old = before.seasons.find((x) => x.number === s.number);
        if (old?.airDate !== s.airDate) {
          ev('temporada_anunciada', `temporada_anunciada:${workId}:${s.number}:${s.airDate}`, `${after.title}: temporada ${s.number} estreia em ${ddmm(s.airDate)}`);
        }
      }
    }
  }

  if (after.kind === 'book' && after.releaseDateBR === today) {
    ev('livro_lancado', `livro_lancado:${workId}`, `${after.title} foi lançado`);
  }
  return out;
}
