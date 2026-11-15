import Papa from 'papaparse';
import { blankToNull, checkSize, ImportFormatError, moreAdvanced, toDate, toRating, toYear, type ImportRow } from './types';

type FileIn = { name: string; text: string };
type Kind = 'watchlist' | 'watched' | 'ratings' | 'reviews' | 'diary';
const KNOWN: Kind[] = ['watchlist', 'watched', 'ratings', 'reviews', 'diary'];

const baseName = (name: string) => name.split(/[\\/]/).pop()!.toLowerCase().replace(/\.csv$/, '');

/** Letterboxd's export (zip of CSVs). Rows are merged by film name + year: review URIs point to the review, not the film. */
export function parseLetterboxd(files: FileIn[]): ImportRow[] {
  const relevant = files.map((f) => ({ ...f, kind: baseName(f.name) as Kind })).filter((f) => KNOWN.includes(f.kind));
  if (relevant.length === 0) throw new ImportFormatError('Arquivo não reconhecido');

  const films = new Map<string, ImportRow>();
  for (const f of relevant) {
    const parsed = Papa.parse<Record<string, string>>(f.text, { header: true, skipEmptyLines: true });
    const fields = parsed.meta.fields ?? [];
    if (!fields.includes('Name') || !fields.includes('Year')) throw new ImportFormatError('Arquivo não reconhecido');

    for (const r of parsed.data) {
      const title = blankToNull(r.Name);
      if (!title) continue;
      const year = toYear(r.Year);
      const key = `${title.toLowerCase()}|${year ?? ''}`;
      const row = films.get(key) ?? {
        kind: 'movie' as const, title, year, author: null, isbn: null, status: 'quero' as const, rating: null, review: null, finishedOn: null,
      };
      if (f.kind !== 'watchlist') row.status = moreAdvanced(row.status, 'concluido');
      row.rating = toRating(r.Rating) ?? row.rating;
      row.review = blankToNull(r.Review) ?? row.review;
      row.finishedOn = toDate(r['Watched Date']) ?? row.finishedOn;
      films.set(key, row);
    }
    checkSize(films.size);
  }
  return [...films.values()];
}
