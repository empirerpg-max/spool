import Papa from 'papaparse';
import { blankToNull, checkSize, ImportFormatError, toDate, toRating, toYear, type ImportRow } from './types';
import type { ListStatus } from '@/lib/list/types';

const REQUIRED = ['Title', 'Author', 'Exclusive Shelf'];

/** Goodreads writes ISBNs as ="9780..." so spreadsheets keep leading zeros. */
const cleanIsbn = (v: unknown) => blankToNull(String(v ?? '').replace(/^="?|"$/g, '').replace(/[^0-9Xx]/g, ''));

const SHELF: Record<string, ListStatus> = { read: 'concluido', 'currently-reading': 'andamento' };

export function parseGoodreads(text: string): ImportRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const fields = parsed.meta.fields ?? [];
  if (!REQUIRED.every((f) => fields.includes(f))) throw new ImportFormatError('Arquivo não reconhecido');
  checkSize(parsed.data.length);

  return parsed.data
    .filter((r) => blankToNull(r.Title))
    .map((r) => {
      const status = SHELF[String(r['Exclusive Shelf']).trim()] ?? 'quero';
      const done = status === 'concluido';
      return {
        kind: 'book' as const,
        title: r.Title.trim(),
        year: toYear(r['Original Publication Year']) ?? toYear(r['Year Published']),
        author: blankToNull(r.Author),
        isbn: cleanIsbn(r.ISBN13) ?? cleanIsbn(r.ISBN),
        status,
        rating: done ? toRating(r['My Rating']) : null,
        review: done ? blankToNull(String(r['My Review'] ?? '').replace(/<br\s*\/?>/gi, '\n')) : null,
        finishedOn: done ? toDate(r['Date Read']) : null,
      };
    });
}
