import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SearchHitItem } from '@/components/SearchHitItem';
import { ListCard } from '@/components/list/ListCard';

describe('SearchHitItem', () => {
  it('links to the work and names its kind', () => {
    render(<ul><SearchHitItem hit={{ kind: 'book', externalId: 'OL1W', title: 'Dom Casmurro', year: 1899, posterUrl: null }} /></ul>);
    expect(screen.getByRole('link', { name: /Dom Casmurro/ })).toHaveAttribute('href', '/obra/livro/OL1W');
    expect(screen.getByText('Livro')).toBeInTheDocument();
    expect(screen.getByText('1899')).toBeInTheDocument();
  });
});

describe('ListCard', () => {
  it('shows poster frame in the kind color, state and stars', () => {
    const { container } = render(
      <ListCard kind="series" externalId="1399" title="Game of Thrones" year={2011} posterUrl={null} statusText="Visto" rating={4.5} />,
    );
    expect(screen.getByRole('link', { name: /Game of Thrones/ })).toHaveAttribute('href', '/obra/serie/1399');
    expect(screen.getByText('Série')).toBeInTheDocument();
    expect(screen.getByText('Visto')).toBeInTheDocument();
    expect(screen.getByLabelText('4,5 estrelas')).toBeInTheDocument();
    expect(container.querySelector('.border-serie')).toBeInTheDocument();
  });
});
