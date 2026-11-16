import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SignedOutHome } from '@/components/home/SignedOutHome';
import type { ReleaseItem } from '@/lib/home/releases';

const films: ReleaseItem[] = [
  { kind: 'movie', externalId: '603', title: 'Matrix', posterUrl: 'https://x/m.jpg', date: '2026-11-10', popularity: 9, label: 'Nos cinemas' },
];

describe('SignedOutHome', () => {
  it('explains the club and offers both ways in', () => {
    render(<SignedOutHome nowPlaying={films} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Um clube para quem ama filmes, séries e livros' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tenho um convite' })).toHaveAttribute('href', '/criar-conta');
    expect(screen.getByRole('link', { name: 'Já sou membro' })).toHaveAttribute('href', '/entrar');
    expect(screen.getByText('Ainda não tem convite? Peça para quem te indicou o Lobby.')).toBeInTheDocument();
  });

  it('shows how it works in three steps', () => {
    render(<SignedOutHome nowPlaying={films} />);
    const how = screen.getByRole('region', { name: 'Como funciona' });
    const steps = within(how).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('Monte sua lista');
    expect(steps[1]).toHaveTextContent('Saiba onde assistir e receba avisos');
    expect(steps[2]).toHaveTextContent('Converse com o clube');
  });

  it('example cards are visibly marked as examples and link to no member', () => {
    render(<SignedOutHome nowPlaying={films} />);
    const inside = screen.getByRole('region', { name: 'Por dentro do clube' });
    const cards = within(inside).getAllByRole('article');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    for (const card of cards) expect(within(card).getByText('exemplo')).toBeInTheDocument();
    expect(within(inside).queryAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/@'))).toEqual([]);
  });

  it('shows the films in theatres with real data, linking to their pages', () => {
    render(<SignedOutHome nowPlaying={films} />);
    const row = screen.getByRole('region', { name: 'Nos cinemas esta semana' });
    expect(within(row).getByRole('link', { name: /Matrix/ })).toHaveAttribute('href', '/obra/filme/603');
  });

  it('still renders when the films could not be loaded', () => {
    render(<SignedOutHome nowPlaying={null} />);
    expect(screen.getByRole('region', { name: 'Nos cinemas esta semana' })).toHaveTextContent('Não foi possível carregar agora.');
  });

  it('keeps the search available', () => {
    render(<SignedOutHome nowPlaying={films} />);
    expect(screen.getByRole('search')).toHaveAttribute('action', '/busca');
  });
});
