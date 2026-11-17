import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CoverGrid } from '@/components/explore/CoverGrid';
import { ExploreFilters } from '@/components/explore/ExploreFilters';
import { olSubject } from '@/lib/explore/books';
import { exploreHref, KIND_LABELS, kindFromTipo, parseFilter, type ExploreFilter, type ExploreKind } from '@/lib/explore/options';
import { tmdbDiscover, type Page } from '@/lib/explore/tmdb';
import { settle } from '@/lib/home/releases';

type Props = { params: Promise<{ tipo: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const kind = kindFromTipo((await params).tipo);
  return { title: kind ? `${KIND_LABELS[kind]} · Explorar · Lobby` : 'Explorar · Lobby' };
}

/** Covers per page of each source (TMDB: 20; Open Library: what we ask for). */
const PER_PAGE: Record<ExploreKind, number> = { movie: 20, series: 20, book: 24 };

function load(kind: ExploreKind, filter: ExploreFilter): Promise<Page> {
  return kind === 'book' ? olSubject(filter.subject, filter) : tmdbDiscover(kind, filter);
}

/** "Ver mais": a grid of covers with filters, order and "Carregar mais". */
export default async function ExploreMorePage({ params, searchParams }: Props) {
  const kind = kindFromTipo((await params).tipo);
  if (!kind) notFound();
  const filter = parseFilter(await searchParams, kind);
  const result = await settle(`explore ${kind} more`, load(kind, filter));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav className="text-sm"><Link href={kind === 'movie' ? '/explorar' : `/explorar?tipo=${(await params).tipo}`} className="underline">← Explorar</Link></nav>
      <h1 className="font-display text-3xl font-extrabold">{KIND_LABELS[kind]}</h1>
      <ExploreFilters kind={kind} filter={filter} />
      {result === null ? (
        <p role="status" className="text-warn">Não foi possível carregar agora. Tente de novo em alguns minutos.</p>
      ) : (
        <>
          <CoverGrid items={result.items} anchorAt={filter.page > 1 ? Math.min((filter.page - 1) * PER_PAGE[kind], result.items.length - 1) : undefined} />
          {result.hasMore && (
            <Link href={`${exploreHref(kind, { ...filter, page: filter.page + 1 })}#mais`}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 font-semibold hover:bg-surface-2">
              Carregar mais
            </Link>
          )}
        </>
      )}
    </div>
  );
}
