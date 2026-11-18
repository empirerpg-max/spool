import type { WorkKind } from '@/lib/catalog/types';
import type { ListStatus } from '@/lib/list/types';

const WATCH: Record<ListStatus, string> = { quero: 'quer ver', andamento: 'está vendo', concluido: 'viu' };
const READ: Record<ListStatus, string> = { quero: 'quer ler', andamento: 'está lendo', concluido: 'leu' };

/** "Micael {verbo} Duna": books use ler forms, films and series use ver forms. */
export function activityVerb(status: ListStatus, kind: WorkKind): string {
  return (kind === 'book' ? READ : WATCH)[status];
}

/** 4.5 → "★★★★½" (ratings go in half steps from 0.5 to 5). */
export function ratingStars(rating: number): string {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
}
