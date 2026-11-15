import Link from 'next/link';
import type { Metadata } from 'next';
import { SearchBox } from '@/components/SearchBox';
import { searchCatalog } from '@/lib/catalog/search';
import { workPath } from '@/lib/catalog/kind';
import type { SearchHit, WorkKind } from '@/lib/catalog/types';

export const metadata: Metadata = { title: 'Busca · Lobby' };

const GROUPS: Array<[WorkKind, string]> = [['movie', 'Filmes'], ['series', 'Séries'], ['book', 'Livros']];

function Hit({ hit }: { hit: SearchHit }) {
  return (
    <li>
      <Link href={workPath(hit.kind, hit.externalId)} className="flex items-center gap-3 rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900">
        {hit.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hit.posterUrl} alt="" width={46} height={69} className="h-[69px] w-[46px] rounded object-cover" />
        ) : (
          <div className="h-[69px] w-[46px] rounded bg-neutral-200 dark:bg-neutral-800" />
        )}
        <span>
          {hit.title}
          {hit.year && <span className="text-neutral-500"> ({hit.year})</span>}
        </span>
      </Link>
    </li>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim();
  const { hits, unavailable } = await searchCatalog(q);

  return (
    <div className="space-y-6">
      <SearchBox defaultValue={q} />
      {unavailable.includes('tmdb') && <p role="status" className="text-amber-600">Filmes e séries indisponíveis no momento</p>}
      {unavailable.includes('books') && <p role="status" className="text-amber-600">Livros indisponíveis no momento</p>}
      {q.length >= 2 && hits.length === 0 && unavailable.length === 0 && <p className="text-neutral-500">Nada encontrado para “{q}”</p>}
      {GROUPS.map(([kind, label]) => {
        const group = hits.filter((h) => h.kind === kind);
        if (!group.length) return null;
        return (
          <section key={kind} className="space-y-2">
            <h2 className="text-xl font-semibold">{label}</h2>
            <ul>{group.map((h) => <Hit key={`${h.kind}-${h.externalId}`} hit={h} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}
