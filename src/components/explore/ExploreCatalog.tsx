import { PeopleList } from '@/components/social/PeopleList';
import { exploreHref, GENRES, PROVIDERS, SUBJECTS, type ExploreKind } from '@/lib/explore/options';
import type { ReleaseItem } from '@/lib/home/releases';
import type { PersonWithFollow } from '@/lib/social/queries';
import { ChipRow } from './ChipRow';
import { Shelf } from './Shelf';

/** Everything the Explorar shelves need. null = that source failed, or it is for members only and this is a visitor. */
export type CatalogData = {
  kind: ExploreKind;
  trending: ReleaseItem[] | null;
  topRated: ReleaseItem[] | null;
  lobby: ReleaseItem[] | null;
  people: PersonWithFollow[] | null;
};

/** "Populares no Lobby" appears only with this many works (nobody can work out one person's list). */
const MIN_LOBBY = 3;

export function ExploreCatalog({ data }: { data: CatalogData }) {
  const { kind } = data;
  const lobby = <Shelf title="Populares no Lobby" items={data.lobby} minItems={MIN_LOBBY} />;
  const people = data.people && data.people.length > 0 && (
    <section aria-labelledby="explore-people" className="space-y-3">
      <h2 id="explore-people" className="font-display text-xl font-bold">Pessoas para seguir</h2>
      <PeopleList people={data.people} path="/explorar" empty="" />
    </section>
  );

  if (kind === 'book') {
    return (
      <div className="space-y-10">
        <Shelf title="Em alta" items={data.trending} more={exploreHref('book', {})} />
        <ChipRow title="Por assunto" chips={SUBJECTS.map((s) => ({ label: s.label, href: exploreHref('book', { subject: s.slug }) }))} />
        {lobby}
        {people}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Shelf title="Em alta esta semana" items={data.trending} more={exploreHref(kind, {})} />
      <Shelf title="Mais bem avaliados" items={data.topRated} more={exploreHref(kind, { sort: 'avaliados' })} />
      <ChipRow title="No seu streaming" chips={PROVIDERS.map((p) => ({ label: p.name, href: exploreHref(kind, { provider: p.id }) }))} />
      <ChipRow title="Por gênero" chips={GENRES[kind].map((g) => ({ label: g.name, href: exploreHref(kind, { genre: g.id }) }))} />
      {lobby}
      {people}
    </div>
  );
}
