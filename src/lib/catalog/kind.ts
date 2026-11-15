import type { WorkKind } from './types';

const SLUGS = { movie: 'filme', series: 'serie', book: 'livro' } as const;
type Slug = (typeof SLUGS)[WorkKind];

export function kindFromSlug(slug: string): WorkKind | null {
  const hit = (Object.entries(SLUGS) as Array<[WorkKind, Slug]>).find(([, s]) => s === slug);
  return hit ? hit[0] : null;
}

export function slugFromKind(kind: WorkKind): Slug {
  return SLUGS[kind];
}

export function workPath(kind: WorkKind, externalId: string): string {
  return `/obra/${slugFromKind(kind)}/${externalId}`;
}

export function isValidExternalId(kind: WorkKind, id: string): boolean {
  return kind === 'book' ? /^OL\d+W$/.test(id) : /^\d+$/.test(id);
}
