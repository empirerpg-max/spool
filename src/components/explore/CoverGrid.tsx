import Link from 'next/link';
import { workPath } from '@/lib/catalog/kind';
import type { ReleaseItem } from '@/lib/home/releases';

type Props = {
  items: ReleaseItem[];
  /** Index of the first cover of the page just loaded: it gets id="mais" so "Carregar mais" lands there. */
  anchorAt?: number;
};

/** Grid of covers ("ver mais" pages); each one opens the work's page. */
export function CoverGrid({ items, anchorAt }: Props) {
  if (items.length === 0) return <p className="text-muted">Nada encontrado com esses filtros.</p>;
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {items.map((i, n) => (
        <li key={`${i.kind}-${i.externalId}`} id={n === anchorAt ? 'mais' : undefined} className="min-w-0 scroll-mt-20">
          <Link href={workPath(i.kind, i.externalId)} className="group block space-y-1.5">
            {i.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.posterUrl} alt="" loading="lazy" width={128} height={192}
                className="aspect-[2/3] w-full rounded-lg border border-line object-cover group-hover:border-line-strong" />
            ) : (
              <span className="block aspect-[2/3] w-full rounded-lg border border-line bg-surface-2" />
            )}
            <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:underline">{i.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
