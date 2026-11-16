import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Ratings, ratingCountLabel } from '@/components/work/Ratings';
import type { ExternalRatings } from '@/lib/catalog/ratings';

const ext = (over: Partial<ExternalRatings> = {}): ExternalRatings => ({
  imdbId: 'tt0133093', imdbRating: 7.8, imdbVotes: 2123456, rtScore: 93, checkedOn: '2026-11-16', ...over,
});

describe('Ratings', () => {
  it('shows the Lobby average with a decimal comma and the count', () => {
    render(<Ratings kind="movie" lobby={{ average: 4.2, count: 12 }} external={null} />);
    expect(screen.getByText('Nota do Lobby')).toBeInTheDocument();
    expect(screen.getByText('4,2 ★')).toBeInTheDocument();
    expect(screen.getByText('12 avaliações')).toBeInTheDocument();
  });

  it('keeps one decimal for whole averages', () => {
    render(<Ratings kind="book" lobby={{ average: 4, count: 3 }} external={null} />);
    expect(screen.getByText('4,0 ★')).toBeInTheDocument();
    expect(screen.getByText('3 avaliações')).toBeInTheDocument();
  });

  it('below 3 ratings shows no average, only a short note', () => {
    const { rerender } = render(<Ratings kind="movie" lobby={{ average: null, count: 2 }} external={null} />);
    expect(screen.getByText('Poucas avaliações no Lobby ainda')).toBeInTheDocument();
    expect(screen.queryByText(/★/)).toBeNull();
    expect(screen.queryByText(/2 avaliações/)).toBeNull();
    rerender(<Ratings kind="movie" lobby={{ average: null, count: 0 }} external={null} />);
    expect(screen.getByText('Poucas avaliações no Lobby ainda')).toBeInTheDocument();
  });

  it('never shows an average the database did not release', () => {
    render(<Ratings kind="movie" lobby={{ average: 5, count: 1 }} external={null} />);
    expect(screen.queryByText(/★/)).toBeNull();
    expect(screen.getByText('Poucas avaliações no Lobby ainda')).toBeInTheDocument();
  });

  it('counts in Portuguese, singular and plural', () => {
    expect(ratingCountLabel(1)).toBe('1 avaliação');
    expect(ratingCountLabel(12)).toBe('12 avaliações');
    expect(ratingCountLabel(1234)).toBe('1.234 avaliações');
  });

  it('shows IMDb with a link to the title and Rotten Tomatoes', () => {
    render(<Ratings kind="series" lobby={null} external={ext()} />);
    const imdb = screen.getByRole('link', { name: /IMDb/ });
    expect(imdb).toHaveAttribute('href', 'https://www.imdb.com/title/tt0133093/');
    expect(imdb).toHaveAttribute('target', '_blank');
    expect(imdb).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(imdb).toHaveTextContent('7,8/10');
    expect(screen.getByText('Rotten Tomatoes')).toBeInTheDocument();
    expect(screen.getByText('93%')).toBeInTheDocument();
  });

  it('hides external pieces that have no score', () => {
    const { rerender } = render(<Ratings kind="movie" lobby={null} external={ext({ rtScore: null })} />);
    expect(screen.getByRole('link', { name: /IMDb/ })).toBeInTheDocument();
    expect(screen.queryByText('Rotten Tomatoes')).toBeNull();
    rerender(<Ratings kind="movie" lobby={null} external={ext({ imdbRating: null })} />);
    expect(screen.queryByRole('link', { name: /IMDb/ })).toBeNull();
    expect(screen.getByText('93%')).toBeInTheDocument();
  });

  it('books only show the Lobby rating', () => {
    render(<Ratings kind="book" lobby={{ average: 4.2, count: 12 }} external={ext()} />);
    expect(screen.queryByRole('link', { name: /IMDb/ })).toBeNull();
    expect(screen.queryByText('Rotten Tomatoes')).toBeNull();
  });

  it('renders nothing when nothing could be loaded', () => {
    const { container } = render(<Ratings kind="movie" lobby={null} external={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
