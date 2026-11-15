import type { NormalizedWork } from './types';

const RUN_DAYS = 60;

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dates are ISO yyyy-mm-dd strings, so lexical comparison is chronological. */
export function cinemaStatus(
  w: Pick<NormalizedWork, 'theatricalDateBR' | 'digitalDateBR'>,
  today: string,
): 'em_cartaz' | 'em_breve' | null {
  const t = w.theatricalDateBR;
  if (!t) return null;
  if (t > today) return 'em_breve';
  const stillRunning = today <= addDays(t, RUN_DAYS);
  const notDigitalYet = w.digitalDateBR === null || w.digitalDateBR > today;
  return stillRunning && notDigitalYet ? 'em_cartaz' : null;
}
