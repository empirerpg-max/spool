import type { Availability, NormalizedWork, SearchHit } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const arr = (v: unknown): Json[] => (Array.isArray(v) ? v : []);
const olCover = (id: unknown) => (typeof id === 'number' && id > 0 ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : null);
const workId = (key: unknown) => String(key ?? '').replace(/^\/works\//, '');

export function normalizeOpenLibrarySearch(json: unknown): SearchHit[] {
  return arr((json as Json)?.docs)
    .filter((d) => str(d?.key))
    .map((d) => ({
      kind: 'book' as const,
      externalId: workId(d.key),
      title: str(d.title) ?? 'Sem título',
      year: typeof d.first_publish_year === 'number' ? d.first_publish_year : null,
      posterUrl: olCover(d.cover_i),
    }));
}

export function pickIsbns(editions: unknown): string[] {
  const entries = arr((editions as Json)?.entries);
  const isPt = (e: Json) => arr(e?.languages).some((l) => l?.key === '/languages/por');
  const ordered = [...entries.filter(isPt), ...entries.filter((e) => !isPt(e))];
  const out: string[] = [];
  for (const e of ordered) {
    for (const isbn of [...arr(e?.isbn_13), ...arr(e?.isbn_10)]) {
      const v = str(isbn);
      if (v && !out.includes(v)) out.push(v);
      if (out.length === 10) return out;
    }
  }
  return out;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeDate(d: string | null): string | null {
  if (!d) return null;
  if (/^\d{4}$/.test(d)) return `${d}-01-01`;
  if (/^\d{4}-\d{2}$/.test(d)) return `${d}-01`;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  return null;
}

function gbooksThumb(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/^http:/, 'https:').replace(/([?&])zoom=\d+/, '$1zoom=1');
}

export function normalizeBook(work: unknown, authors: string[], isbns: string[], gbooks: unknown | null): NormalizedWork {
  const w = work as Json;
  const vol = arr((gbooks as Json)?.items)[0];
  const info = vol?.volumeInfo ?? null;

  const olTitle = str(w?.title) ?? 'Sem título';
  const title = str(info?.title) ?? olTitle;

  let overview: string | null = null;
  let overviewLang: NormalizedWork['overviewLang'] = null;
  const gDesc = str(info?.description);
  const olDesc = str(typeof w?.description === 'string' ? w.description : w?.description?.value);
  if (gDesc) {
    overview = stripHtml(gDesc);
    overviewLang = /^pt\b/i.test(String(info?.language ?? '')) ? 'pt-BR' : 'en';
  } else if (olDesc) {
    overview = olDesc;
    overviewLang = 'en';
  }

  const availability: Availability[] = [];
  const buyLink = str(vol?.saleInfo?.buyLink);
  if (buyLink) availability.push({ provider: 'Google Play Livros', type: 'store', logoUrl: null, link: buyLink });
  if (isbns[0]) availability.push({ provider: 'Amazon', type: 'store', logoUrl: null, link: `https://www.amazon.com.br/s?k=${isbns[0]}` });
  availability.push({ provider: 'Estante Virtual', type: 'store', logoUrl: null, link: `https://www.estantevirtual.com.br/busca?q=${encodeURIComponent(title)}` });

  return {
    kind: 'book',
    externalId: workId(w?.key),
    title,
    originalTitle: olTitle !== title ? olTitle : null,
    overview,
    overviewLang,
    posterUrl: gbooksThumb(str(info?.imageLinks?.thumbnail)) ?? olCover(arr(w?.covers)[0]),
    releaseDateBR: normalizeDate(str(info?.publishedDate)),
    theatricalDateBR: null,
    digitalDateBR: null,
    trailerYoutubeKey: null,
    people: authors,
    availability,
    seasons: [],
    isbns,
  };
}
