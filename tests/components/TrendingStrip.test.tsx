import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrendingStrip } from '@/components/home/TrendingStrip';
import type { ReleaseItem } from '@/lib/home/releases';

const items: ReleaseItem[] = [
  { kind: 'movie', externalId: '603', title: 'Matrix', posterUrl: 'https://x/m.jpg', date: null, popularity: 9 },
  { kind: 'book', externalId: 'OL1W', title: 'Torto Arado', posterUrl: 'https://x/b.jpg', date: null, popularity: 0 },
];

describe('TrendingStrip', () => {
  it('shows popular releases of every kind with a link to the home', () => {
    render(<TrendingStrip items={items} />);
    const strip = screen.getByRole('region', { name: 'Em alta nos lançamentos' });
    expect(within(strip).getByRole('link', { name: /Matrix/ })).toHaveAttribute('href', '/obra/filme/603');
    expect(within(strip).getByText('Livro')).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/');
    expect(within(strip).getByRole('list')).toHaveClass('overflow-x-auto');
  });

  it('is left out when no release could be loaded', () => {
    const { container } = render(<TrendingStrip items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
