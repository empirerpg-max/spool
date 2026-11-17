import Link from 'next/link';
import { KIND_LABELS, type ExploreKind } from '@/lib/explore/options';

const KINDS: ExploreKind[] = ['movie', 'series', 'book'];

type Props = {
  /** null = "Tudo" (only with `withAll`). */
  active: ExploreKind | null;
  hrefFor: (kind: ExploreKind | null) => string;
  /** Offer "Tudo" first (search results). */
  withAll?: boolean;
};

/** Filmes / Séries / Livros. The choice lives in the address, so it can be shared. */
export function KindTabs({ active, hrefFor, withAll = false }: Props) {
  const tabs: Array<[ExploreKind | null, string]> = [...(withAll ? [[null, 'Tudo'] as [null, string]] : []), ...KINDS.map((k) => [k, KIND_LABELS[k]] as [ExploreKind, string])];
  return (
    <nav aria-label="Tipo de obra">
      <ul className="flex flex-wrap gap-2">
        {tabs.map(([kind, label]) => {
          const current = kind === active;
          return (
            <li key={label}>
              <Link href={hrefFor(kind)} aria-current={current ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-5 font-semibold ${
                  current ? 'bg-fg text-bg' : 'border border-line-strong hover:bg-surface-2'}`}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
