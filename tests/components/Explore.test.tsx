import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/social/actions', () => ({ follow: vi.fn(async () => ({})), unfollow: vi.fn(async () => ({})) }));

import { Shelf } from '@/components/explore/Shelf';
import { ChipRow } from '@/components/explore/ChipRow';
import { CoverGrid } from '@/components/explore/CoverGrid';
import { KindTabs } from '@/components/explore/KindTabs';
import { ExploreCatalog, type CatalogData } from '@/components/explore/ExploreCatalog';
import { ExploreSearch } from '@/components/explore/ExploreSearch';
import { ExploreFilters } from '@/components/explore/ExploreFilters';
import { WorkResults } from '@/components/explore/WorkResults';
import type { ReleaseItem } from '@/lib/home/releases';
import type { SearchHit } from '@/lib/catalog/types';

const item = (n: number, kind: ReleaseItem['kind'] = 'movie'): ReleaseItem => ({
  kind, externalId: kind === 'book' ? `OL${n}W` : String(n), title: `Obra ${n}`, posterUrl: `https://img/${n}.jpg`, date: null, popularity: 0,
});
const three = [item(1), item(2), item(3)];

describe('Shelf', () => {
  it('shows a titled row with "Ver mais"', () => {
    render(<Shelf title="Em alta esta semana" items={three} more="/explorar/filmes" />);
    const row = screen.getByRole('region', { name: 'Em alta esta semana' });
    expect(within(row).getByRole('link', { name: /Obra 1/ })).toHaveAttribute('href', '/obra/filme/1');
    expect(within(row).getByRole('link', { name: 'Ver mais' })).toHaveAttribute('href', '/explorar/filmes');
  });

  it('disappears when its source failed or is empty (Review Focus 1)', () => {
    const { container } = render(<><Shelf title="A" items={null} /><Shelf title="B" items={[]} /></>);
    expect(container).toBeEmptyDOMElement();
  });

  it('can require a minimum number of works', () => {
    const { container } = render(<Shelf title="Populares no Lobby" items={three.slice(0, 2)} minItems={3} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ChipRow', () => {
  it('lists links and marks the chosen one', () => {
    render(<ChipRow title="No seu streaming" chips={[
      { label: 'Netflix', href: '/explorar/filmes?provedor=8', active: true },
      { label: 'Max', href: '/explorar/filmes?provedor=1899' },
    ]} />);
    const row = screen.getByRole('region', { name: 'No seu streaming' });
    expect(within(row).getByRole('link', { name: 'Netflix' })).toHaveAttribute('aria-current', 'true');
    expect(within(row).getByRole('link', { name: 'Max' })).not.toHaveAttribute('aria-current');
  });
});

describe('KindTabs', () => {
  it('links to each kind and marks the current one', () => {
    render(<KindTabs active="series" hrefFor={(k) => `/explorar?tipo=${k}`} />);
    expect(screen.getByRole('link', { name: 'Séries' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Filmes' })).toHaveAttribute('href', '/explorar?tipo=movie');
    expect(screen.queryByRole('link', { name: 'Tudo' })).not.toBeInTheDocument();
  });

  it('can offer "Tudo" (search results)', () => {
    render(<KindTabs active={null} hrefFor={(k) => (k ? `/x?tipo=${k}` : '/x')} withAll />);
    expect(screen.getByRole('link', { name: 'Tudo' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('CoverGrid', () => {
  it('shows covers linking to their works', () => {
    render(<CoverGrid items={[item(1, 'book'), item(2, 'series')]} />);
    expect(screen.getByRole('link', { name: /Obra 1/ })).toHaveAttribute('href', '/obra/livro/OL1W');
    expect(screen.getByRole('link', { name: /Obra 2/ })).toHaveAttribute('href', '/obra/serie/2');
  });

  it('says so when there is nothing', () => {
    render(<CoverGrid items={[]} />);
    expect(screen.getByText('Nada encontrado com esses filtros.')).toBeInTheDocument();
  });
});

describe('ExploreSearch', () => {
  it('searches inside Explorar, keeping the kind', () => {
    render(<ExploreSearch q="duna" tipo="series" />);
    const box = screen.getByRole('searchbox', { name: 'Buscar' });
    expect(box).toHaveValue('duna');
    expect(box.closest('form')).toHaveAttribute('action', '/explorar');
    expect(box).not.toHaveFocus();
  });

  it('searching from the Pessoas tab stays there', () => {
    const { container } = render(<ExploreSearch q="ana" tab="pessoas" />);
    expect(container.querySelector('input[name="aba"]')).toHaveValue('pessoas');
  });

  it('is focused when coming from "Adicionar à minha lista"', () => {
    render(<ExploreSearch q="" autoFocus />);
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveFocus();
  });
});

const films: CatalogData = {
  kind: 'movie',
  trending: three,
  topRated: [item(4)],
  lobby: [item(5), item(6), item(7)],
  people: [{ id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, isMe: false, isFollowing: false }],
};

describe('ExploreCatalog', () => {
  it('films: shelves, streaming and genre chips', () => {
    render(<ExploreCatalog data={films} />);
    expect(screen.getByRole('region', { name: 'Em alta esta semana' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Mais bem avaliados' })).getByRole('link', { name: 'Ver mais' }))
      .toHaveAttribute('href', '/explorar/filmes?ordem=avaliados');
    expect(within(screen.getByRole('region', { name: 'No seu streaming' })).getByRole('link', { name: 'Netflix' }))
      .toHaveAttribute('href', '/explorar/filmes?provedor=8');
    expect(within(screen.getByRole('region', { name: 'Por gênero' })).getByRole('link', { name: 'Terror' }))
      .toHaveAttribute('href', '/explorar/filmes?genero=27');
    expect(screen.getByRole('region', { name: 'Populares no Lobby' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Pessoas para seguir' })).getByRole('link', { name: /Ana/ }))
      .toHaveAttribute('href', '/@ana');
  });

  it('series link to the series pages', () => {
    render(<ExploreCatalog data={{ ...films, kind: 'series' }} />);
    expect(within(screen.getByRole('region', { name: 'No seu streaming' })).getByRole('link', { name: 'Globoplay' }))
      .toHaveAttribute('href', '/explorar/series?provedor=307');
  });

  it('a failed source hides only its shelf (Review Focus 1)', () => {
    render(<ExploreCatalog data={{ ...films, trending: null, topRated: null }} />);
    expect(screen.queryByRole('region', { name: 'Em alta esta semana' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Mais bem avaliados' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Por gênero' })).toBeInTheDocument();
  });

  it('visitors see no member data (Review Focus 2)', () => {
    render(<ExploreCatalog data={{ ...films, lobby: null, people: null }} />);
    expect(screen.queryByRole('region', { name: 'Populares no Lobby' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Pessoas para seguir' })).not.toBeInTheDocument();
  });

  it('"Populares no Lobby" needs at least 3 works', () => {
    render(<ExploreCatalog data={{ ...films, lobby: [item(5), item(6)] }} />);
    expect(screen.queryByRole('region', { name: 'Populares no Lobby' })).not.toBeInTheDocument();
  });

  it('books: trending, subjects and Lobby, no streaming or top rated', () => {
    render(<ExploreCatalog data={{ kind: 'book', trending: [item(1, 'book')], topRated: null, lobby: null, people: null }} />);
    expect(within(screen.getByRole('region', { name: 'Em alta' })).getByRole('link', { name: 'Ver mais' }))
      .toHaveAttribute('href', '/explorar/livros');
    expect(within(screen.getByRole('region', { name: 'Por assunto' })).getByRole('link', { name: 'Terror' }))
      .toHaveAttribute('href', '/explorar/livros?assunto=horror');
    expect(screen.queryByRole('region', { name: 'No seu streaming' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Por gênero' })).not.toBeInTheDocument();
  });
});

describe('ExploreFilters ("ver mais")', () => {
  it('chips combine with the current filter and the chosen ones can be undone', () => {
    render(<ExploreFilters kind="movie" filter={{ provider: 8, genre: 27, sort: 'avaliados', page: 3 }} />);
    const streaming = screen.getByRole('region', { name: 'Streaming' });
    expect(within(streaming).getByRole('link', { name: 'Netflix' })).toHaveAttribute('aria-current', 'true');
    // Choosing it again removes it; page goes back to 1.
    expect(within(streaming).getByRole('link', { name: 'Netflix' })).toHaveAttribute('href', '/explorar/filmes?genero=27&ordem=avaliados');
    expect(within(streaming).getByRole('link', { name: 'Max' })).toHaveAttribute('href', '/explorar/filmes?provedor=1899&genero=27&ordem=avaliados');
    const order = screen.getByRole('region', { name: 'Ordem' });
    expect(within(order).getByRole('link', { name: 'Mais recentes' })).toHaveAttribute('href', '/explorar/filmes?provedor=8&genero=27&ordem=recentes');
    expect(within(order).getByRole('link', { name: 'Mais bem avaliados' })).toHaveAttribute('aria-current', 'true');
  });

  it('books filter by subject', () => {
    render(<ExploreFilters kind="book" filter={{ subject: 'horror', sort: 'populares', page: 1 }} />);
    expect(screen.queryByRole('region', { name: 'Streaming' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Assunto' })).getByRole('link', { name: 'Romance' }))
      .toHaveAttribute('href', '/explorar/livros?assunto=romance');
  });
});

describe('WorkResults', () => {
  const hits: SearchHit[] = [
    { kind: 'movie', externalId: '1', title: 'Duna', year: 2021, posterUrl: null },
    { kind: 'book', externalId: 'OL1W', title: 'Duna (livro)', year: 1965, posterUrl: null },
  ];

  it('groups works by kind', () => {
    render(<WorkResults q="duna" kind={null} hits={hits} unavailable={[]} />);
    expect(screen.getByRole('heading', { name: 'Filmes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Duna \(livro\)/ })).toHaveAttribute('href', '/obra/livro/OL1W');
  });

  it('the kind tabs also filter the results', () => {
    render(<WorkResults q="duna" kind="book" hits={hits} unavailable={[]} />);
    expect(screen.queryByRole('heading', { name: 'Filmes' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Duna \(livro\)/ })).toBeInTheDocument();
  });

  it('says when nothing was found or a source is down', () => {
    const { unmount } = render(<WorkResults q="xyz" kind="series" hits={hits} unavailable={['books']} />);
    expect(screen.getByText('Nada encontrado para “xyz”')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument(); // books being down doesn't matter for series
    unmount();
    render(<WorkResults q="duna" kind={null} hits={hits.slice(0, 1)} unavailable={['books']} />);
    expect(screen.getByRole('status')).toHaveTextContent('Livros indisponíveis no momento');
  });
});
