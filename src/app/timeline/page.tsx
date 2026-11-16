import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TrendingStrip } from '@/components/home/TrendingStrip';
import { TimelineEmpty } from '@/components/social/TimelineEmpty';
import { TimelineItem } from '@/components/social/TimelineItem';
import { getCurrentUser } from '@/lib/auth/current-user';
import { loadReleases, todaySaoPaulo, trending } from '@/lib/home/releases';
import { cursorHref, parseCursor } from '@/lib/social/cursor';
import { loadTimeline, timelineSuggestions } from '@/lib/social/timeline';

export const metadata: Metadata = { title: 'Timeline · Lobby' };

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ antes?: string; id?: string }> }) {
  const before = parseCursor(await searchParams);
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(before ? cursorHref(before) : '/timeline')}`);
  // The strip only on the first page; release lists are cached for hours and never break the page.
  const [{ entries, next }, releases] = await Promise.all([loadTimeline(before), before ? null : loadReleases(todaySaoPaulo())]);
  const empty = entries.length === 0 && !before;

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Timeline</h1>
        {user.username && !user.banned && (
          <Link href="/publicar" className="rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg">Publicar</Link>
        )}
      </header>

      {releases && <TrendingStrip items={trending(releases)} />}

      {empty ? (
        <TimelineEmpty {...await timelineSuggestions()} />
      ) : (
        <>
          {entries.length === 0 ? (
            <p className="text-muted">Não há nada mais antigo por aqui.</p>
          ) : (
            <ul className="space-y-4">
              {entries.map((e) => <li key={e.key}><TimelineItem entry={e} /></li>)}
            </ul>
          )}
          <nav className="flex gap-4 text-sm">
            {before && <Link href="/timeline" className="underline">Voltar ao mais recente</Link>}
            {next && <Link href={cursorHref(next)} className="rounded-full border border-line-strong px-5 py-2 font-semibold hover:bg-surface-2">Carregar mais</Link>}
          </nav>
        </>
      )}
    </section>
  );
}
