import { SearchHitItem } from '@/components/SearchHitItem';
import type { SearchHit } from '@/lib/catalog/types';
import { KIND_LABELS, type ExploreKind } from '@/lib/explore/options';

const KINDS: ExploreKind[] = ['movie', 'series', 'book'];
const DOWN = { tmdb: 'Filmes e séries indisponíveis no momento', books: 'Livros indisponíveis no momento' } as const;

type Props = {
  q: string;
  /** null = every kind ("Tudo"). */
  kind: ExploreKind | null;
  hits: SearchHit[];
  unavailable: Array<'tmdb' | 'books'>;
};

/** "Obras" tab of the search: works found, grouped by kind. */
export function WorkResults({ q, kind, hits, unavailable }: Props) {
  const kinds = kind ? [kind] : KINDS;
  const shown = hits.filter((h) => kinds.includes(h.kind));
  const relevant = unavailable.filter((s) => (s === 'books' ? kinds.includes('book') : kinds.some((k) => k !== 'book')));
  return (
    <div className="space-y-8">
      {relevant.map((s) => <p key={s} role="status" className="text-warn">{DOWN[s]}</p>)}
      {shown.length === 0 && relevant.length === 0 && <p className="text-muted">Nada encontrado para “{q}”</p>}
      {kinds.map((k) => {
        const group = shown.filter((h) => h.kind === k);
        if (group.length === 0) return null;
        return (
          <section key={k} className="space-y-2">
            <h2 className="font-display text-xl font-bold">{KIND_LABELS[k]}</h2>
            <ul className="grid gap-1 sm:grid-cols-2">{group.map((h) => <SearchHitItem key={`${h.kind}-${h.externalId}`} hit={h} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}
