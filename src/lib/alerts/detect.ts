import type { AvailabilityType, NormalizedWork } from '@/lib/catalog/types';

export type EventKind = 'cinema' | 'streaming' | 'temporada_anunciada' | 'temporada_estreia' | 'livro_lancado';
export type DetectedEvent = { kind: EventKind; key: string; title: string; body: string | null; url: string };

const STREAMING: AvailabilityType[] = ['subscription', 'free', 'ads'];
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** Days back a date-based event still counts, so a late or skipped daily check doesn't lose it (dedupe prevents repeats). */
const GRACE_DAYS = 3;
const daysBefore = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};
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
  const from = daysBefore(today, GRACE_DAYS - 1);
  const happened = (date: string | null) => date !== null && date >= from && date <= today;

  if (after.kind === 'movie' && happened(after.theatricalDateBR)) {
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
      if (happened(s.airDate)) {
        ev('temporada_estreia', `temporada_estreia:${workId}:${s.number}`, `${after.title}: temporada ${s.number} estreou`);
      } else if (before && s.airDate > today) {
        const old = before.seasons.find((x) => x.number === s.number);
        if (old?.airDate !== s.airDate) {
          ev('temporada_anunciada', `temporada_anunciada:${workId}:${s.number}:${s.airDate}`, `${after.title}: temporada ${s.number} estreia em ${ddmm(s.airDate)}`);
        }
      }
    }
  }

  if (after.kind === 'book' && happened(after.releaseDateBR)) {
    ev('livro_lancado', `livro_lancado:${workId}`, `${after.title} foi lançado`);
  }
  return out;
}
