import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { workPath } from '@/lib/catalog/kind';
import type { ReleaseItem } from '@/lib/home/releases';

const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const opening = (iso: string) => `Estreia ${day.format(new Date(`${iso}T00:00:00Z`))}`;

type Props = {
  title: string;
  /** null = the source could not be loaded right now. */
  items: ReleaseItem[] | null;
  /** Show "Estreia 4 de dez." under each title. */
  showDate?: boolean;
  /** Tag each item with Filme/Série/Livro (rows that mix kinds). */
  showKind?: boolean;
  /** Smaller posters (Timeline strip). */
  compact?: boolean;
  more?: { href: string; label: string };
};

/** A titled row of posters that scrolls sideways on its own (never the whole page). */
export function ReleaseRow({ title, items, showDate, showKind, compact, more }: Props) {
  if (items !== null && items.length === 0) return null;
  const width = compact ? 'w-20 sm:w-24' : 'w-28 sm:w-32';
  const headingId = `row-${title.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <section aria-labelledby={headingId} className="min-w-0 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className={`font-display font-bold ${compact ? 'text-base' : 'text-xl'}`}>{title}</h2>
        {more && <Link href={more.href} className="shrink-0 text-sm font-semibold underline">{more.label}</Link>}
      </div>
      {items === null ? (
        <p className="text-sm text-muted">Não foi possível carregar agora.</p>
      ) : (
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {items.map((i) => (
            <li key={`${i.kind}-${i.externalId}`} className={`${width} shrink-0 snap-start`}>
              <Link href={workPath(i.kind, i.externalId)} className="group block space-y-1.5">
                {i.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.posterUrl} alt="" loading="lazy" width={128} height={192}
                    className="aspect-[2/3] w-full rounded-lg border border-line object-cover group-hover:border-line-strong" />
                ) : (
                  <span className="block aspect-[2/3] w-full rounded-lg border border-line bg-surface-2" />
                )}
                <span className={`line-clamp-2 font-semibold leading-snug group-hover:underline ${compact ? 'text-xs' : 'text-sm'}`}>{i.title}</span>
                {showKind && <KindTag kind={i.kind} />}
                {showDate && i.date && <span className="block text-xs text-muted">{opening(i.date)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
