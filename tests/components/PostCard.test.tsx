import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const actions = vi.hoisted(() => ({
  likePost: vi.fn(async () => ({ ok: true })), unlikePost: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/social/actions', () => actions);

import { PostCard } from '@/components/social/PostCard';
import type { SocialPost } from '@/lib/social/types';

const ID = '6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b';
const post = (over: Partial<SocialPost> = {}): SocialPost => ({
  id: ID,
  author: { id: 'a1', username: 'ana', displayName: 'Ana Lê', avatarUrl: null },
  work: { id: 'w1', kind: 'movie', externalId: '603', title: 'Matrix', posterUrl: 'https://img/603.jpg', year: 1999 },
  caption: 'Revi hoje e continua perfeito.', hasSpoiler: false, likeCount: 3, replyCount: 2,
  createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(), likedByMe: false, isMine: false, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('PostCard', () => {
  it('shows author name, @ linking to the profile, time and caption', () => {
    render(<PostCard post={post()} />);
    expect(screen.getByText('Ana Lê')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@ana' })).toHaveAttribute('href', '/@ana');
    expect(screen.getByRole('link', { name: 'há 2 horas' })).toHaveAttribute('href', `/p/${ID}`);
    expect(screen.getByText('Revi hoje e continua perfeito.')).toBeInTheDocument();
  });

  it('cites the work with its kind, linking to the work page', () => {
    render(<PostCard post={post()} />);
    const link = screen.getByRole('link', { name: /Matrix/ });
    expect(link).toHaveAttribute('href', '/obra/filme/603');
    expect(link).toHaveTextContent('Filme');
  });

  it('hides a spoiler caption until asked', () => {
    render(<PostCard post={post({ hasSpoiler: true })} />);
    expect(screen.queryByText('Revi hoje e continua perfeito.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Contém spoiler — mostrar' }));
    expect(screen.getByText('Revi hoje e continua perfeito.')).toBeInTheDocument();
  });

  it('shows like and reply counts; replies link to the post', () => {
    render(<PostCard post={post()} />);
    expect(screen.getByRole('button', { name: 'Curtir (3 curtidas)' })).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: '2 respostas' })).toHaveAttribute('href', `/p/${ID}`);
  });

  it('like toggles and calls the action', async () => {
    render(<PostCard post={post({ likeCount: 1 })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Curtir (1 curtida)' }));
    expect(actions.likePost).toHaveBeenCalledWith(ID);
    const liked = await screen.findByRole('button', { name: 'Descurtir (2 curtidas)' });
    expect(liked).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(liked);
    expect(actions.unlikePost).toHaveBeenCalledWith(ID);
  });

  it('falls back to the @ when there is no profile name', () => {
    render(<PostCard post={post({ author: { id: 'a1', username: 'ana', displayName: null, avatarUrl: null } })} />);
    expect(screen.getAllByText('@ana').length).toBeGreaterThan(0);
  });
});
