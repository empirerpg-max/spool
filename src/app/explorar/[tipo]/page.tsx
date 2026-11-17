import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CoverGrid } from '@/components/explore/CoverGrid';
import { ExploreFilters } from '@/components/explore/ExploreFilters';
import { ShelfSkeleton } from '@/components/explore/ShelfSkeleton';
import { olSubject } from '@/lib/explore/books';
import { exploreHref, KIND_LABELS, kindFromTipo, parseFilter, type ExploreFilter, type ExploreKind } from '@/lib/explore/options';
import { moreAnchor, tmdbDiscover, type Page } from '@/lib/explore/tmdb';
import { settle } from '@/lib/home/releases';

type Props = { params: Promise<{ tipo: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const kind = kindFromTipo((await params).tipo);
  return { title: kind ? `${KIND_LABELS[kind]} · Explorar · Lobby` : 'Explorar · Lobby' };
}

function load(kind: ExploreKind, filter: ExploreFilter): Promise<Page> {
  return kind === 'book' ? olSubject(filter.subject, filter) : tmdbDiscover(kind, filter);
}

/** The covers and "Carregar mais"; streams in after the title and filters (Open Library can be slow). */
async function MoreResults({ kind, filter }: { kind: ExploreKind; filter: ExploreFilter }) {
  const result = await settle(`explore ${kind} more`, load(kind, filter));
  if (result === null) {
    return <p role="status" className="text-warn">Não foi possível carregar agora. Tente de novo em alguns minutos.</p>;
  }
  return (
    <>
      <CoverGrid items={result.items} anchorAt={moreAnchor(filter.page, result)} />
      {result.hasMore && (
        <Link href={`${exploreHref(kind, { ...filter, page: filter.page + 1 })}#mais`}
          className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 font-semibold hover:bg-surface-2">
          Carregar mais
        </Link>
      )}
    </>
  );
}

/** "Ver mais": a grid of covers with filters, order and "Carregar mais". */
export default async function ExploreMorePage({ params, searchParams }: Props) {
  const { tipo } = await params;
  const kind = kindFromTipo(tipo);
  if (!kind) notFound();
  const filter = parseFilter(await searchParams, kind);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav className="text-sm"><Link href={kind === 'movie' ? '/explorar' : `/explorar?tipo=${tipo}`} className="underline">← Explorar</Link></nav>
      <h1 className="font-display text-3xl font-extrabold">{KIND_LABELS[kind]}</h1>
      <ExploreFilters kind={kind} filter={filter} />
      {/* A new filter is a new list: show the placeholder again. "Carregar mais" (same filter, next page) keeps
          the covers on screen until the longer list is ready, so it can scroll to the first new one. */}
      <Suspense key={exploreHref(kind, { ...filter, page: 1 })} fallback={<ShelfSkeleton title={KIND_LABELS[kind]} grid />}>
        <MoreResults kind={kind} filter={filter} />
      </Suspense>
    </div>
  );
}
