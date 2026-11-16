import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorkHero } from '@/components/work/WorkHero';
import type { NormalizedWork } from '@/lib/catalog/types';

const work = (over: Partial<NormalizedWork> = {}): NormalizedWork => ({
  kind: 'series', externalId: '1399', title: 'Game of Thrones', originalTitle: null, overview: null, overviewLang: null,
  posterUrl: 'https://image.tmdb.org/t/p/w500/p.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w1280/b.jpg',
  releaseDateBR: '2011-04-17', theatricalDateBR: null, digitalDateBR: null, trailerYoutubeKey: null,
  people: [], availability: [], seasons: [], isbns: [], imdbId: null, ...over,
});

describe('WorkHero', () => {
  it('shows kind, title, year and topic count linking to the community', () => {
    render(<WorkHero work={work()} topicCount={24} />);
    expect(screen.getByText('Série')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Game of Thrones/ })).toBeInTheDocument();
    expect(screen.getByText('2011')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '24 tópicos' })).toHaveAttribute('href', '#comunidade');
  });

  it('uses singular and empty wording', () => {
    const { rerender } = render(<WorkHero work={work()} topicCount={1} />);
    expect(screen.getByRole('link', { name: '1 tópico' })).toBeInTheDocument();
    rerender(<WorkHero work={work()} topicCount={0} />);
    expect(screen.getByRole('link', { name: 'Seja o primeiro a abrir um tópico' })).toBeInTheDocument();
  });

  it('hides the topic line when the community is unavailable', () => {
    render(<WorkHero work={work()} topicCount={null} />);
    expect(screen.queryByRole('link', { name: /tópico/ })).toBeNull();
  });

  it('draws the backdrop, or falls back without breaking', () => {
    const { container, rerender } = render(<WorkHero work={work()} topicCount={0} />);
    expect(container.querySelector('[data-hero-bg="backdrop"]')).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w1280/b.jpg');
    rerender(<WorkHero work={work({ backdropUrl: null })} topicCount={0} />);
    expect(container.querySelector('[data-hero-bg="poster"]')).toBeInTheDocument();
    rerender(<WorkHero work={work({ backdropUrl: null, posterUrl: null, kind: 'book', title: 'Sem capa' })} topicCount={0} />);
    expect(container.querySelector('[data-hero-bg="gradient"]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Sem capa/ })).toBeInTheDocument();
    expect(screen.getByText('Livro')).toBeInTheDocument();
  });

  it('renders children (the list controls) inside the hero', () => {
    render(<WorkHero work={work()} topicCount={0}><button type="button">Quero ver</button></WorkHero>);
    expect(screen.getByRole('button', { name: 'Quero ver' })).toBeInTheDocument();
  });
});
