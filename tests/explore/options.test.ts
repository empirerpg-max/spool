import { describe, it, expect } from 'vitest';
import { exploreHref, kindFromTipo, parseFilter, parseKind, PROVIDERS, SUBJECTS, tipoFromKind } from '@/lib/explore/options';

describe('parseKind', () => {
  it('reads ?tipo= and starts on films', () => {
    expect(parseKind('filmes')).toBe('movie');
    expect(parseKind('series')).toBe('series');
    expect(parseKind('livros')).toBe('book');
    expect(parseKind(undefined)).toBe('movie');
    expect(parseKind('qualquer')).toBe('movie');
    expect(parseKind(['livros', 'series'])).toBe('book');
  });

  it('maps the "ver mais" address both ways, unknown is null', () => {
    expect(kindFromTipo('series')).toBe('series');
    expect(kindFromTipo('filme')).toBeNull();
    expect(tipoFromKind('book')).toBe('livros');
  });
});

describe('constants', () => {
  it('has the streaming services used in Brazil', () => {
    expect(PROVIDERS.map((p) => [p.name, p.id])).toEqual([
      ['Netflix', 8], ['Prime Video', 119], ['Max', 1899], ['Disney+', 337], ['Globoplay', 307], ['Apple TV+', 350], ['Paramount+', 531],
    ]);
  });

  it('has the book subjects', () => {
    expect(SUBJECTS.map((s) => s.slug)).toEqual([
      'romance', 'fantasy', 'science_fiction', 'mystery_and_detective_stories', 'horror', 'classics',
      'brazilian_literature', 'nonfiction', 'biography', 'juvenile_fiction',
    ]);
    expect(SUBJECTS.find((s) => s.slug === 'science_fiction')?.label).toBe('Ficção científica');
  });
});

describe('parseFilter (Review Focus 5)', () => {
  it('reads genre, provider, sort and page for films', () => {
    expect(parseFilter({ genero: '27', provedor: '8', ordem: 'avaliados', pagina: '3' }, 'movie'))
      .toEqual({ genre: 27, provider: 8, sort: 'avaliados', page: 3 });
  });

  it('drops an unknown genre, provider or subject', () => {
    expect(parseFilter({ genero: '999999', provedor: '1' }, 'movie')).toEqual({ sort: 'populares', page: 1 });
    expect(parseFilter({ assunto: 'x' }, 'book')).toEqual({ sort: 'populares', page: 1 });
    expect(parseFilter({ genero: 'abc', provedor: '8.5' }, 'series')).toEqual({ sort: 'populares', page: 1 });
  });

  it('uses the genres of each kind', () => {
    expect(parseFilter({ genero: '10765' }, 'series').genre).toBe(10765); // Sci-Fi & Fantasy (series only)
    expect(parseFilter({ genero: '10765' }, 'movie').genre).toBeUndefined();
  });

  it('keeps only what each kind has', () => {
    expect(parseFilter({ assunto: 'horror', genero: '27', provedor: '8' }, 'book')).toEqual({ subject: 'horror', sort: 'populares', page: 1 });
    expect(parseFilter({ assunto: 'horror' }, 'movie')).toEqual({ sort: 'populares', page: 1 });
  });

  it('unknown sort falls back to popular; page is kept between 1 and 20', () => {
    expect(parseFilter({ ordem: 'x', pagina: '0' }, 'movie')).toEqual({ sort: 'populares', page: 1 });
    expect(parseFilter({ pagina: '99' }, 'movie').page).toBe(20);
    expect(parseFilter({ pagina: 'abc' }, 'movie').page).toBe(1);
  });
});

describe('exploreHref', () => {
  it('builds the "ver mais" address, leaving defaults out', () => {
    expect(exploreHref('movie', { provider: 8 })).toBe('/explorar/filmes?provedor=8');
    expect(exploreHref('series', { genre: 18, sort: 'recentes', page: 2 })).toBe('/explorar/series?genero=18&ordem=recentes&pagina=2');
    expect(exploreHref('book', { subject: 'horror', sort: 'populares', page: 1 })).toBe('/explorar/livros?assunto=horror');
    expect(exploreHref('movie', {})).toBe('/explorar/filmes');
  });
});

describe('GENRES', () => {
  it('lists genres in Portuguese for films and series', async () => {
    const { GENRES } = await import('@/lib/explore/options');
    expect(GENRES.movie.find((g) => g.id === 27)?.name).toBe('Terror');
    expect(GENRES.series.find((g) => g.id === 10765)?.name).toBe('Ficção científica e fantasia');
    expect(GENRES.series.some((g) => g.id === 27)).toBe(false);
  });
});
