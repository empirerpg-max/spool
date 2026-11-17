import { ReleaseRow } from '@/components/home/ReleaseRow';
import type { ReleaseItem } from '@/lib/home/releases';

type Props = {
  title: string;
  /** null = the source could not be loaded (or is not for this visitor): the shelf is left out. */
  items: ReleaseItem[] | null;
  /** "Ver mais" address. */
  more?: string;
  /** Show the shelf only with at least this many works. */
  minItems?: number;
};

/** An Explorar shelf. It never shows an error: a shelf that can't be filled simply isn't there. */
export function Shelf({ title, items, more, minItems = 1 }: Props) {
  if (!items || items.length < Math.max(minItems, 1)) return null;
  return <ReleaseRow title={title} items={items} more={more ? { href: more, label: 'Ver mais' } : undefined} />;
}
