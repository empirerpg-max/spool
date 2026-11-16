export type WorkKind = 'movie' | 'series' | 'book';
export type AvailabilityType = 'subscription' | 'free' | 'ads' | 'rent' | 'buy' | 'store';
export interface Availability { provider: string; logoUrl: string | null; type: AvailabilityType; link: string | null; }
export interface Season { number: number; airDate: string | null; episodeCount: number; }
export interface NormalizedWork {
  kind: WorkKind;
  /** TMDB id as string, or Open Library work id ("OL45804W") */
  externalId: string;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  overviewLang: 'pt-BR' | 'en' | null;
  posterUrl: string | null;
  /** Wide image for the page header (TMDB backdrop); null for books. */
  backdropUrl: string | null;
  /** ISO yyyy-mm-dd; movie: BR theatrical (fallback global), series: first air, book: publish date */
  releaseDateBR: string | null;
  /** movies only */
  theatricalDateBR: string | null;
  /** movies only */
  digitalDateBR: string | null;
  trailerYoutubeKey: string | null;
  /** top 5 cast, or authors */
  people: string[];
  availability: Availability[];
  /** series only, else [] */
  seasons: Season[];
  /** books only, else [] */
  isbns: string[];
  /** IMDb title id ("tt0133093") from TMDB, used to look up IMDb/Rotten Tomatoes scores; null for books. */
  imdbId: string | null;
}
export interface SearchHit { kind: WorkKind; externalId: string; title: string; year: number | null; posterUrl: string | null; }
