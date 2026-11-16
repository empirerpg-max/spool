import type { WorkKind } from '@/lib/catalog/types';

// Literal class names on purpose: Tailwind only generates classes it can find in the source.
export const KIND_LABEL: Record<WorkKind, 'Filme' | 'Série' | 'Livro'> = { movie: 'Filme', series: 'Série', book: 'Livro' };
const TEXT: Record<WorkKind, string> = { movie: 'text-film', series: 'text-serie', book: 'text-livro' };
const BG: Record<WorkKind, string> = { movie: 'bg-film', series: 'bg-serie', book: 'bg-livro' };
const BORDER: Record<WorkKind, string> = { movie: 'border-film', series: 'border-serie', book: 'border-livro' };

export const kindTextClass = (kind: WorkKind) => TEXT[kind];
export const kindBgClass = (kind: WorkKind) => BG[kind];
export const kindBorderClass = (kind: WorkKind) => BORDER[kind];
