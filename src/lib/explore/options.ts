/** What Explorar can show and how its addresses are read and written. */
export type ExploreKind = 'movie' | 'series' | 'book';
export type ExploreSort = 'populares' | 'avaliados' | 'recentes';
export type ExploreFilter = { genre?: number; provider?: number; subject?: string; sort: ExploreSort; page: number };

type Params = Record<string, string | string[] | undefined>;

export const MAX_PAGE = 20;

const TIPOS: Record<ExploreKind, string> = { movie: 'filmes', series: 'series', book: 'livros' };

export const KIND_LABELS: Record<ExploreKind, string> = { movie: 'Filmes', series: 'Séries', book: 'Livros' };

export const SORTS: Array<{ value: ExploreSort; label: string }> = [
  { value: 'populares', label: 'Populares' },
  { value: 'avaliados', label: 'Mais bem avaliados' },
  { value: 'recentes', label: 'Mais recentes' },
];

/** Streaming services common in Brazil (TMDB ids, catalog for watch_region=BR). */
export const PROVIDERS: Array<{ id: number; name: string }> = [
  { id: 8, name: 'Netflix' },
  { id: 119, name: 'Prime Video' },
  { id: 1899, name: 'Max' },
  { id: 337, name: 'Disney+' },
  { id: 307, name: 'Globoplay' },
  { id: 350, name: 'Apple TV+' },
  { id: 531, name: 'Paramount+' },
];

/** Book subjects: label → Open Library subject. */
export const SUBJECTS: Array<{ slug: string; label: string }> = [
  { slug: 'romance', label: 'Romance' },
  { slug: 'fantasy', label: 'Fantasia' },
  { slug: 'science_fiction', label: 'Ficção científica' },
  { slug: 'mystery_and_detective_stories', label: 'Mistério e suspense' },
  { slug: 'horror', label: 'Terror' },
  { slug: 'classics', label: 'Clássicos' },
  { slug: 'brazilian_literature', label: 'Literatura brasileira' },
  { slug: 'nonfiction', label: 'Não ficção' },
  { slug: 'biography', label: 'Biografias' },
  { slug: 'juvenile_fiction', label: 'Infantojuvenil' },
];

/** TMDB genres (their ids are stable), with Portuguese names. */
export const GENRES: Record<'movie' | 'series', Array<{ id: number; name: string }>> = {
  movie: [
    { id: 28, name: 'Ação' }, { id: 35, name: 'Comédia' }, { id: 18, name: 'Drama' }, { id: 27, name: 'Terror' },
    { id: 10749, name: 'Romance' }, { id: 878, name: 'Ficção científica' }, { id: 53, name: 'Suspense' },
    { id: 12, name: 'Aventura' }, { id: 16, name: 'Animação' }, { id: 80, name: 'Crime' }, { id: 99, name: 'Documentário' },
    { id: 10751, name: 'Família' }, { id: 14, name: 'Fantasia' }, { id: 36, name: 'História' }, { id: 9648, name: 'Mistério' },
    { id: 10402, name: 'Música' }, { id: 10752, name: 'Guerra' }, { id: 37, name: 'Faroeste' },
  ],
  series: [
    { id: 18, name: 'Drama' }, { id: 35, name: 'Comédia' }, { id: 80, name: 'Crime' }, { id: 10759, name: 'Ação e aventura' },
    { id: 10765, name: 'Ficção científica e fantasia' }, { id: 9648, name: 'Mistério' }, { id: 16, name: 'Animação' },
    { id: 99, name: 'Documentário' }, { id: 10751, name: 'Família' }, { id: 10762, name: 'Infantil' },
    { id: 10764, name: 'Reality' }, { id: 10766, name: 'Novela' }, { id: 10768, name: 'Guerra e política' }, { id: 37, name: 'Faroeste' },
  ],
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const int = (v: string | string[] | undefined) => { const s = first(v); return s && /^\d+$/.test(s) ? Number(s) : null; };

/** `?tipo=filmes|series|livros`; films by default. */
export function parseKind(v: string | string[] | undefined): ExploreKind {
  return kindFromTipo(first(v) ?? '') ?? 'movie';
}

export function kindFromTipo(tipo: string): ExploreKind | null {
  const hit = (Object.entries(TIPOS) as Array<[ExploreKind, string]>).find(([, t]) => t === tipo);
  return hit ? hit[0] : null;
}

export const tipoFromKind = (kind: ExploreKind) => TIPOS[kind];

/** Filters of a "ver mais" page. Anything unknown is left out, so an old or edited address still works. */
export function parseFilter(params: Params, kind: ExploreKind): ExploreFilter {
  const sortRaw = first(params.ordem);
  const sort = SORTS.some((s) => s.value === sortRaw) ? (sortRaw as ExploreSort) : 'populares';
  const page = Math.min(Math.max(int(params.pagina) ?? 1, 1), MAX_PAGE);
  const out: ExploreFilter = { sort, page };
  if (kind === 'book') {
    const subject = first(params.assunto);
    if (subject && SUBJECTS.some((s) => s.slug === subject)) out.subject = subject;
    return out;
  }
  const genre = int(params.genero);
  if (genre !== null && GENRES[kind].some((g) => g.id === genre)) out.genre = genre;
  const provider = int(params.provedor);
  if (provider !== null && PROVIDERS.some((p) => p.id === provider)) out.provider = provider;
  return out;
}

/** Address of a "ver mais" page; defaults (popular, page 1) are left out. */
export function exploreHref(kind: ExploreKind, f: Partial<ExploreFilter>): string {
  const q = new URLSearchParams();
  if (f.provider !== undefined) q.set('provedor', String(f.provider));
  if (f.genre !== undefined) q.set('genero', String(f.genre));
  if (f.subject !== undefined) q.set('assunto', f.subject);
  if (f.sort && f.sort !== 'populares') q.set('ordem', f.sort);
  if (f.page && f.page > 1) q.set('pagina', String(f.page));
  const qs = q.toString();
  return `/explorar/${TIPOS[kind]}${qs ? `?${qs}` : ''}`;
}
