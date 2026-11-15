import type { ListStatus } from '@/lib/list/types';

export type ImportRow = {
  kind: 'movie' | 'book';
  title: string;
  year: number | null;
  author: string | null;
  isbn: string | null;
  status: ListStatus;
  rating: number | null;
  review: string | null;
  finishedOn: string | null;
};

export const MAX_IMPORT_ROWS = 5000;

export class ImportFormatError extends Error {
  readonly name = 'ImportFormatError';
}

const RANK: Record<ListStatus, number> = { quero: 0, andamento: 1, concluido: 2 };
export const moreAdvanced = (a: ListStatus, b: ListStatus): ListStatus => (RANK[b] > RANK[a] ? b : a);

export function checkSize(n: number) {
  if (n > MAX_IMPORT_ROWS) throw new ImportFormatError(`Arquivo grande demais (máximo ${MAX_IMPORT_ROWS} itens)`);
}

/** Half-star rating within 0.5–5, else null (0 means "no rating" in both exports). */
export function toRating(v: unknown): number | null {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) && n >= 0.5 && n <= 5 && Number.isInteger(n * 2) ? n : null;
}

export function toYear(v: unknown): number | null {
  const n = Number(String(v ?? '').trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** "2023/05/14" or "2023-05-14" → "2023-05-14". */
export function toDate(v: unknown): string | null {
  const m = String(v ?? '').trim().match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export const blankToNull = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};
