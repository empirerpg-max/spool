import type { ReleaseItem } from '@/lib/home/releases';
import { ReleaseRow } from './ReleaseRow';

/** Compact "Em alta nos lançamentos" strip at the top of the Timeline page; the full rows live on the home. */
export function TrendingStrip({ items }: { items: ReleaseItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <ReleaseRow title="Em alta nos lançamentos" items={items} showKind compact more={{ href: '/', label: 'Ver todos' }} />
    </div>
  );
}
