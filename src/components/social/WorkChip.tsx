import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { workPath } from '@/lib/catalog/kind';
import { kindBorderClass } from '@/lib/kind-style';
import type { PostWork } from '@/lib/social/types';

/** Small card of the work a post cites: cover, title, kind and year, linking to the work page. */
export function WorkChip({ work }: { work: Omit<PostWork, 'id'> }) {
  return (
    <Link href={workPath(work.kind, work.externalId)}
      className="flex max-w-full items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-2 pr-4 hover:border-line-strong">
      {work.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={work.posterUrl} alt="" width={32} height={48} loading="lazy" className={`h-12 w-8 shrink-0 rounded border-b-2 object-cover ${kindBorderClass(work.kind)}`} />
      ) : (
        <span className={`h-12 w-8 shrink-0 rounded border-b-2 bg-surface ${kindBorderClass(work.kind)}`} />
      )}
      <span className="min-w-0 space-y-0.5">
        <span className="block truncate font-semibold">{work.title}</span>
        <span className="flex items-center gap-2 text-xs text-muted">
          <KindTag kind={work.kind} />
          {work.year && <span>{work.year}</span>}
        </span>
      </span>
    </Link>
  );
}
