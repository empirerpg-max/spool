import { exploreHref, GENRES, PROVIDERS, sortsFor, SUBJECTS, type ExploreFilter, type ExploreKind } from '@/lib/explore/options';
import { ChipRow } from './ChipRow';

/**
 * Filters of a "ver mais" page. Streaming, genre and order combine ("terror no Netflix, bem avaliado");
 * choosing a chosen chip again removes it. Any change goes back to the first page.
 */
export function ExploreFilters({ kind, filter }: { kind: ExploreKind; filter: ExploreFilter }) {
  const base = { ...filter, page: 1 };
  const href = (change: Partial<ExploreFilter>) => exploreHref(kind, { ...base, ...change });
  return (
    <div className="space-y-4">
      {kind === 'book' ? (
        <ChipRow small title="Assunto" chips={SUBJECTS.map((s) => {
          const active = filter.subject === s.slug;
          return { label: s.label, active, href: href({ subject: active ? undefined : s.slug }) };
        })} />
      ) : (
        <>
          <ChipRow small title="Streaming" chips={PROVIDERS.map((p) => {
            const active = filter.provider === p.id;
            return { label: p.name, active, href: href({ provider: active ? undefined : p.id }) };
          })} />
          <ChipRow small title="Gênero" chips={GENRES[kind].map((g) => {
            const active = filter.genre === g.id;
            return { label: g.name, active, href: href({ genre: active ? undefined : g.id }) };
          })} />
        </>
      )}
      <ChipRow small title="Ordem" chips={sortsFor(kind).map((s) => ({ label: s.label, active: filter.sort === s.value, href: href({ sort: s.value }) }))} />
    </div>
  );
}
