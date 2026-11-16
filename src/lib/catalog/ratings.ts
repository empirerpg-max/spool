import type { OmdbRatings } from './omdb';

/** IMDb / Rotten Tomatoes scores stored on a work. */
export type ExternalRatings = OmdbRatings & { imdbId: string | null; checkedOn: string | null };

/** Members' average (null below 3 ratings) and how many rated. */
export type LobbyRating = { average: number | null; count: number };

const MAX_AGE_DAYS = 7;
const DAY_MS = 86_400_000;

export const todaySaoPaulo = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);

/** OMDb is asked again only when the work has an IMDb id and was never checked, or more than 7 days ago. */
export function ratingsDue(imdbId: string | null, checkedOn: string | null, today: string): boolean {
  if (!imdbId) return false;
  if (!checkedOn) return true;
  return (Date.parse(today) - Date.parse(checkedOn)) / DAY_MS > MAX_AGE_DAYS;
}

export type RefreshDeps = {
  today: string;
  read: (workId: string) => Promise<ExternalRatings | null>;
  /** Null means "couldn't ask" (no key, OMDb down): nothing is recorded and the work stays due. */
  fetchRatings: (imdbId: string) => Promise<OmdbRatings | null>;
  write: (workId: string, ratings: OmdbRatings, today: string) => Promise<void>;
  /** Takes one OMDb call from the budget; false when it is spent. */
  budget?: () => boolean;
};

/** Returns the work's external scores, asking OMDb first when they are due. */
export async function refreshRatingsIfDue(workId: string, d: RefreshDeps): Promise<ExternalRatings | null> {
  const current = await d.read(workId);
  if (!current || !current.imdbId || !ratingsDue(current.imdbId, current.checkedOn, d.today)) return current;
  if (d.budget && !d.budget()) return current;
  const fresh = await d.fetchRatings(current.imdbId);
  if (!fresh) return current;
  // Recorded even when OMDb has no scores ("N/A"), so the work isn't asked about again every day.
  await d.write(workId, fresh, d.today).catch((e) => console.error('[ratings] save failed', e));
  return { ...current, ...fresh, checkedOn: d.today };
}

/** At most `limit` OMDb calls per day (São Paulo date) in this server process. */
export function dailyBudget(limit: number) {
  let day = '';
  let used = 0;
  return (today: string): boolean => {
    if (day !== today) { day = today; used = 0; }
    if (used >= limit) return false;
    used++;
    return true;
  };
}
