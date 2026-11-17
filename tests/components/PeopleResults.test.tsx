import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/social/actions', () => ({ follow: vi.fn(async () => ({})), unfollow: vi.fn(async () => ({})) }));

import { PeopleResults } from '@/components/explore/PeopleResults';
import { ResultTabs } from '@/components/explore/ResultTabs';
import { toPeople } from '@/lib/social/people-search';
import type { PersonWithFollow } from '@/lib/social/queries';

const joao: PersonWithFollow = { id: 'u1', username: 'jsilva', displayName: 'João da Silva', avatarUrl: 'https://x/a.jpg', isMe: false, isFollowing: true };
const bia: PersonWithFollow = { id: 'u2', username: 'bia', displayName: null, avatarUrl: null, isMe: false, isFollowing: false };

describe('PeopleResults', () => {
  it('shows photo, name, @ link and follow state', () => {
    const { container } = render(<PeopleResults q="silva" member people={[joao, bia]} suggestions={[]} />);
    expect(screen.getByRole('link', { name: /João da Silva/ })).toHaveAttribute('href', '/@jsilva');
    expect(screen.getByText('@jsilva')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://x/a.jpg');
    expect(screen.getByRole('link', { name: '@bia' })).toHaveAttribute('href', '/@bia');
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Seguindo');
    expect(buttons[1]).toHaveTextContent('Seguir');
  });

  it('says when nobody was found', () => {
    render(<PeopleResults q="zzz" member people={[]} suggestions={[bia]} />);
    expect(screen.getByText('Ninguém encontrado com esse nome.')).toBeInTheDocument();
    expect(screen.queryByText('Pessoas para seguir')).not.toBeInTheDocument();
  });

  it('empty search: people to follow', () => {
    render(<PeopleResults q="" member people={[]} suggestions={[bia]} />);
    expect(screen.getByRole('heading', { name: 'Pessoas para seguir' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@bia' })).toBeInTheDocument();
  });

  it('visitors are asked to sign in and see nobody (Review Focus 2)', () => {
    render(<PeopleResults q="joão silva" member={false} people={[]} suggestions={[]} />);
    const link = screen.getByRole('link', { name: 'Entre para encontrar pessoas' });
    expect(link).toHaveAttribute('href', `/entrar?next=${encodeURIComponent('/explorar?q=jo%C3%A3o+silva&aba=pessoas')}`);
  });
});

describe('ResultTabs', () => {
  it('switches between Obras and Pessoas keeping the search', () => {
    render(<ResultTabs q="duna" tab="pessoas" tipo="livros" />);
    const nav = screen.getByRole('navigation', { name: 'Resultados' });
    expect(within(nav).getByRole('link', { name: 'Pessoas' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Obras' })).toHaveAttribute('href', '/explorar?q=duna&tipo=livros');
    expect(within(nav).getByRole('link', { name: 'Pessoas' })).toHaveAttribute('href', '/explorar?q=duna&aba=pessoas');
  });
});

describe('toPeople', () => {
  it('turns search rows into people with follow state', () => {
    expect(toPeople([
      { id: 'u1', username: 'jsilva', display_name: 'João', avatar_url: null, i_follow: true },
      { id: 'u3', username: null, display_name: 'Sem @', avatar_url: null, i_follow: false },
    ])).toEqual([{ id: 'u1', username: 'jsilva', displayName: 'João', avatarUrl: null, isMe: false, isFollowing: true }]);
  });
});
