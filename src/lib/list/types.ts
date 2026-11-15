import type { WorkKind } from '@/lib/catalog/types';

export const LIST_STATUSES = ['quero', 'andamento', 'concluido'] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

const WATCH: Record<ListStatus, string> = { quero: 'Quero ver', andamento: 'Vendo', concluido: 'Visto' };
const READ: Record<ListStatus, string> = { quero: 'Quero ler', andamento: 'Lendo', concluido: 'Lido' };

export function statusLabel(kind: WorkKind, status: ListStatus): string {
  return (kind === 'book' ? READ : WATCH)[status];
}

export type ListItem = {
  workId: string;
  status: ListStatus;
  rating: number | null;
  review: string | null;
  reviewHasSpoiler: boolean;
  finishedOn: string | null;
  published: boolean;
  reviewTopicId: string | null;
  updatedAt: string;
};

export type ListEntry = ListItem & {
  work: { kind: WorkKind; externalId: string; title: string; posterUrl: string | null; year: number | null };
};
