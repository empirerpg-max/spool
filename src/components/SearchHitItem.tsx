import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { workPath } from '@/lib/catalog/kind';
import type { SearchHit } from '@/lib/catalog/types';
import { kindBorderClass } from '@/lib/kind-style';

export function SearchHitItem({ hit }: { hit: SearchHit }) {
  return (
    <li>
      <Link href={workPath(hit.kind, hit.externalId)} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface">
        {hit.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hit.posterUrl} alt="" width={46} height={69} loading="lazy" className={`h-[69px] w-[46px] shrink-0 rounded-md border-b-2 object-cover ${kindBorderClass(hit.kind)}`} />
        ) : (
          <div className={`h-[69px] w-[46px] shrink-0 rounded-md border-b-2 bg-surface-2 ${kindBorderClass(hit.kind)}`} />
        )}
        <span className="min-w-0 space-y-1">
          <span className="block break-words font-semibold">{hit.title}</span>
          <span className="flex items-center gap-2 text-sm text-muted">
            <KindTag kind={hit.kind} />
            {hit.year && <span>{hit.year}</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}
