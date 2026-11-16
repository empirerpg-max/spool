import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { Stars } from '@/components/list/StarRating';
import { workPath } from '@/lib/catalog/kind';
import type { WorkKind } from '@/lib/catalog/types';
import { kindBorderClass } from '@/lib/kind-style';

type Props = {
  kind: WorkKind; externalId: string; title: string; year: number | null; posterUrl: string | null;
  statusText: string; rating: number | null;
};

export function ListCard({ kind, externalId, title, year, posterUrl, statusText, rating }: Props) {
  return (
    <Link href={workPath(kind, externalId)} className="group block space-y-2">
      <div className={`overflow-hidden rounded-lg border-b-4 bg-surface-2 ${kindBorderClass(kind)}`}>
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="" loading="lazy" className="aspect-[2/3] w-full object-cover transition group-hover:opacity-90" />
        ) : (
          <div className="flex aspect-[2/3] w-full items-center justify-center text-sm text-muted">Sem capa</div>
        )}
      </div>
      <p className="break-words font-semibold leading-tight">
        {title}
        {year && <span className="font-normal text-muted"> {year}</span>}
      </p>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <KindTag kind={kind} />
        <span>{statusText}</span>
        {rating !== null && <Stars value={rating} />}
      </p>
    </Link>
  );
}
