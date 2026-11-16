import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/social/actions', () => ({
  likePost: vi.fn(), unlikePost: vi.fn(), follow: vi.fn(async () => ({ ok: true })), unfollow: vi.fn(),
}));

import { ReleaseRow } from '@/components/home/ReleaseRow';
import { HomeTimeline } from '@/components/home/HomeTimeline';
import type { ReleaseItem } from '@/lib/home/releases';
import type { TimelineEntry } from '@/lib/social/types';

const items: ReleaseItem[] = [
  { kind: 'movie', externalId: '603', title: 'Matrix', posterUrl: 'https://image.tmdb.org/t/p/w342/m.jpg', date: '2026-12-04', popularity: 9, label: 'Em breve' },
  { kind: 'series', externalId: '1399', title: 'Game of Thrones', posterUrl: null, date: null, popularity: 3 },
  { kind: 'book', externalId: 'OL1W', title: 'Torto Arado', posterUrl: 'https://books.google.com/x', date: '2026-10-01', popularity: 0 },
];

describe('ReleaseRow', () => {
  it('shows a titled row whose items link to their work pages', () => {
    render(<ReleaseRow title="Lançamentos" items={items} />);
    const row = screen.getByRole('region', { name: 'Lançamentos' });
    expect(within(row).getByRole('link', { name: /Matrix/ })).toHaveAttribute('href', '/obra/filme/603');
    expect(within(row).getByRole('link', { name: /Game of Thrones/ })).toHaveAttribute('href', '/obra/serie/1399');
    expect(within(row).getByRole('link', { name: /Torto Arado/ })).toHaveAttribute('href', '/obra/livro/OL1W');
  });

  it('scrolls sideways inside the row instead of widening the page', () => {
    render(<ReleaseRow title="Lançamentos" items={items} />);
    expect(screen.getByRole('list')).toHaveClass('overflow-x-auto');
  });

  it('can show the opening date', () => {
    render(<ReleaseRow title="Filmes — em breve" items={[items[0]]} showDate />);
    expect(screen.getByText('Estreia 4 de dez.')).toBeInTheDocument();
  });

  it('can tag each item with its kind (mixed rows)', () => {
    render(<ReleaseRow title="Em alta" items={items} showKind />);
    expect(screen.getByText('Filme')).toBeInTheDocument();
    expect(screen.getByText('Livro')).toBeInTheDocument();
  });

  it('says so briefly when the source could not be loaded', () => {
    render(<ReleaseRow title="Séries no ar" items={null} />);
    expect(screen.getByRole('region', { name: 'Séries no ar' })).toHaveTextContent('Não foi possível carregar agora.');
  });

  it('is left out when there is nothing to show', () => {
    const { container } = render(<ReleaseRow title="Séries no ar" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('can carry a link to see more', () => {
    render(<ReleaseRow title="Em alta" items={items} more={{ href: '/', label: 'Ver todos' }} />);
    expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/');
  });
});

describe('HomeTimeline', () => {
  const bia = { id: 'b1', username: 'bia', displayName: 'Bia', avatarUrl: null };
  const entry: TimelineEntry = {
    type: 'review', key: 'review:1', createdAt: new Date().toISOString(), actor: bia,
    work: { kind: 'movie', externalId: '603', title: 'Matrix', posterUrl: null, year: 1999 }, href: '/obra/filme/603/topicos/t1', hasSpoiler: false,
  };

  it('shows recent entries and a link to the full timeline', () => {
    render(<HomeTimeline entries={[entry]} people={[]} communities={[]} />);
    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByText(/publicou uma resenha de/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver timeline completa' })).toHaveAttribute('href', '/timeline');
  });

  it('shows at most 8 entries', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...entry, key: `review:${i}` }));
    render(<HomeTimeline entries={many} people={[]} communities={[]} />);
    expect(screen.getAllByText(/publicou uma resenha de/)).toHaveLength(8);
  });

  it('suggests people and communities when empty', () => {
    render(<HomeTimeline entries={[]} people={[{ ...bia, recentPosts: 1 }]} communities={[]} />);
    expect(screen.getByText('Sua timeline está vazia por enquanto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
  });

  it('does not break the home when the timeline could not be loaded', () => {
    render(<HomeTimeline entries={null} people={[]} communities={[]} />);
    expect(screen.getByText('Não foi possível carregar agora.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver timeline completa' })).toBeInTheDocument();
  });
});
