import Link from 'next/link';
import { connection } from 'next/server';
import { HomeTimeline } from '@/components/home/HomeTimeline';
import { ReleaseRow } from '@/components/home/ReleaseRow';
import { SearchBox } from '@/components/SearchBox';
import { getCurrentUser } from '@/lib/auth/current-user';
import { loadReleases, todaySaoPaulo } from '@/lib/home/releases';
import { loadTimeline, timelineSuggestions } from '@/lib/social/timeline';
import type { TimelineEntry } from '@/lib/social/types';

const KINDS = [
  { label: 'Filmes', q: 'Duna', cls: 'border-film text-film' },
  { label: 'Séries', q: 'The Bear', cls: 'border-serie text-serie' },
  { label: 'Livros', q: 'Torto Arado', cls: 'border-livro text-livro' },
];

function SignedOutHome() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-16 text-center sm:py-24">
      <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
        Onde filmes, séries e livros viram conversa.
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Salve o que quer ver e ler, descubra onde assistir no Brasil e converse com quem já viu na comunidade de cada obra.
      </p>
      <div className="w-full">
        <SearchBox />
      </div>
      <ul className="flex flex-wrap justify-center gap-3" aria-label="Sugestões de busca">
        {KINDS.map((k) => (
          <li key={k.label}>
            <Link href={`/busca?q=${encodeURIComponent(k.q)}`} className={`inline-block rounded-full border px-4 py-1.5 text-sm font-semibold ${k.cls}`}>
              {k.label} · {k.q}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
  return user ? <SignedInHome /> : <SignedOutHome />;
}
