import type { Metadata } from 'next';
import { SearchBox } from '@/components/SearchBox';
import { searchCatalog } from '@/lib/catalog/search';
import type { WorkKind } from '@/lib/catalog/types';
import { SearchHitItem } from '@/components/SearchHitItem';

export const metadata: Metadata = { title: 'Busca · Lobby' };

const GROUPS: Array<[WorkKind, string]> = [['movie', 'Filmes'], ['series', 'Séries'], ['book', 'Livros']];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim();
  const { hits, unavailable } = await searchCatalog(q);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <SearchBox defaultValue={q} />
      {unavailable.includes('tmdb') && <p role="status" className="text-warn">Filmes e séries indisponíveis no momento</p>}
      {unavailable.includes('books') && <p role="status" className="text-warn">Livros indisponíveis no momento</p>}
      {q.length >= 2 && hits.length === 0 && unavailable.length === 0 && <p className="text-muted">Nada encontrado para “{q}”</p>}
      {GROUPS.map(([kind, label]) => {
        const group = hits.filter((h) => h.kind === kind);
        if (!group.length) return null;
        return (
          <section key={kind} className="space-y-2">
            <h2 className="font-display text-xl font-bold">{label}</h2>
            <ul className="grid gap-1 sm:grid-cols-2">{group.map((h) => <SearchHitItem key={`${h.kind}-${h.externalId}`} hit={h} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}
