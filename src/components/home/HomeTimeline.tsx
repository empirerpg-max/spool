import Link from 'next/link';
import { TimelineEmpty } from '@/components/social/TimelineEmpty';
import { TimelineItem } from '@/components/social/TimelineItem';
import type { ActiveCommunity, SuggestedPerson, TimelineEntry } from '@/lib/social/types';

export const HOME_TIMELINE_SIZE = 8;

type Props = {
  /** null = the timeline could not be loaded right now. */
  entries: TimelineEntry[] | null;
  people: SuggestedPerson[];
  communities: ActiveCommunity[];
};

/** The first few timeline entries on the home, with a link to the full page. */
export function HomeTimeline({ entries, people, communities }: Props) {
  return (
    <section aria-labelledby="home-timeline" className="min-w-0 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-timeline" className="font-display text-xl font-bold">Timeline</h2>
        <Link href="/timeline" className="shrink-0 text-sm font-semibold underline">Ver timeline completa</Link>
      </div>
      {entries === null ? (
        <p className="text-sm text-muted">Não foi possível carregar agora.</p>
      ) : entries.length === 0 ? (
        <TimelineEmpty people={people} communities={communities} path="/" compact />
      ) : (
        <ul className="space-y-4">
          {entries.slice(0, HOME_TIMELINE_SIZE).map((e) => <li key={e.key}><TimelineItem entry={e} /></li>)}
        </ul>
      )}
    </section>
  );
}
