import { PeopleList } from '@/components/social/PeopleList';
import { exploreHref, GENRES, PROVIDERS, SUBJECTS, type ExploreKind } from '@/lib/explore/options';
import type { ReleaseItem } from '@/lib/home/releases';
import type { PersonWithFollow } from '@/lib/social/queries';
import { ChipRow } from './ChipRow';
import { Deferred } from './Deferred';
import { Shelf } from './Shelf';
import { ShelfSkeleton } from './ShelfSkeleton';

/** A shelf's source: already loaded, or still on its way (the page streams it in). */
type Source<T> = T | Promise<T>;

/**
 * Everything the Explorar shelves need. null = that source failed, or it is for members only and this is a visitor.
 * Each one may still be loading: the page shows at once and each shelf fills in on its own.
 */
export type CatalogData = {
  kind: ExploreKind;
  trending: Source<ReleaseItem[] | null>;
  topRated: Source<ReleaseItem[] | null>;
  lobby: Source<ReleaseItem[] | null>;
  people: Source<PersonWithFollow[] | null>;
};

/** "Populares no Lobby" appears only with this many works (nobody can work out one person's list). */
const MIN_LOBBY = 3;
const MORE_POPULAR = 'Ver mais populares';

function StreamedShelf({ title, items, more, moreLabel, minItems }: {
  title: string; items: Source<ReleaseItem[] | null>; more?: string; moreLabel?: string; minItems?: number;
}) {
  if (items === null) return null;
  return (
    <Deferred value={items} fallback={<ShelfSkeleton title={title} />}>
      {(v) => <Shelf title={title} items={v} more={more} moreLabel={moreLabel} minItems={minItems} />}
    </Deferred>
  );
}

export function ExploreCatalog({ data }: { data: CatalogData }) {
  const { kind } = data;
  const lobby = <StreamedShelf title="Populares no Lobby" items={data.lobby} minItems={MIN_LOBBY} />;
  const people = data.people !== null && (
    <Deferred value={data.people} fallback={null}>
      {(list) => list && list.length > 0 && (
        <section aria-labelledby="explore-people" className="space-y-3">
          <h2 id="explore-people" className="font-display text-xl font-bold">Pessoas para seguir</h2>
          <PeopleList people={list} path="/explorar" empty="" />
        </section>
      )}
    </Deferred>
  );

  if (kind === 'book') {
    return (
      <div className="space-y-10">
        {/* "Ver mais" without a subject is this same recent Portuguese fiction, just longer. */}
        <StreamedShelf title="Em alta" items={data.trending} more={exploreHref('book', {})} moreLabel={MORE_POPULAR} />
        <ChipRow title="Por assunto" chips={SUBJECTS.map((s) => ({ label: s.label, href: exploreHref('book', { subject: s.slug }) }))} />
        {lobby}
        {people}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <StreamedShelf title="Em alta esta semana" items={data.trending} more={exploreHref(kind, {})} moreLabel={MORE_POPULAR} />
      <StreamedShelf title="Mais bem avaliados" items={data.topRated} more={exploreHref(kind, { sort: 'avaliados' })} />
      <ChipRow title="No seu streaming" chips={PROVIDERS.map((p) => ({ label: p.name, href: exploreHref(kind, { provider: p.id }) }))} />
      <ChipRow title="Por gênero" chips={GENRES[kind].map((g) => ({ label: g.name, href: exploreHref(kind, { genre: g.id }) }))} />
      {lobby}
      {people}
    </div>
  );
}
