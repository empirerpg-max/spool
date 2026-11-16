import { connection } from 'next/server';
import { HomeTimeline } from '@/components/home/HomeTimeline';
import { ReleaseRow } from '@/components/home/ReleaseRow';
import { SignedOutHome } from '@/components/home/SignedOutHome';
import { getCurrentUser } from '@/lib/auth/current-user';
import { loadNowPlaying, loadReleases, todaySaoPaulo } from '@/lib/home/releases';
import { loadTimeline, timelineSuggestions } from '@/lib/social/timeline';
import type { TimelineEntry } from '@/lib/social/types';

/** The timeline never breaks the home: on failure the panel says so briefly. */
async function timelineEntries(): Promise<TimelineEntry[] | null> {
  try {
    return (await loadTimeline(null)).entries;
  } catch (e) {
    console.error('[home] timeline failed', e);
    return null;
  }
}

async function SignedInHome() {
  const [releases, entries] = await Promise.all([loadReleases(todaySaoPaulo()), timelineEntries()]);
  const suggestions = entries?.length === 0 ? await timelineSuggestions() : { people: [], communities: [] };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-8">
        <h1 className="font-display text-3xl font-extrabold">Lançamentos</h1>
        <ReleaseRow title="Filmes — nos cinemas" items={releases.nowPlaying} />
        <ReleaseRow title="Filmes — em breve" items={releases.upcoming} showDate />
        <ReleaseRow title="Séries no ar" items={releases.series} />
        <ReleaseRow title="Livros recém-lançados" items={releases.books} />
      </div>
      <aside className="min-w-0 lg:border-l lg:border-line lg:pl-8">
        <HomeTimeline entries={entries} {...suggestions} />
      </aside>
    </div>
  );
}

export default async function Home() {
  await connection(); // per-visitor page; the release lists themselves stay cached for hours
  const user = await getCurrentUser();
  return user ? <SignedInHome /> : <SignedOutHome nowPlaying={await loadNowPlaying()} />;
}
