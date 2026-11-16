import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/social/actions', () => ({
  likePost: vi.fn(), unlikePost: vi.fn(), follow: vi.fn(async () => ({ ok: true })), unfollow: vi.fn(),
}));

import { TimelineItem } from '@/components/social/TimelineItem';
import { TimelineEmpty } from '@/components/social/TimelineEmpty';
import type { SocialPost, TimelineEntry } from '@/lib/social/types';

const now = new Date().toISOString();
const bia = { id: 'b1', username: 'bia', displayName: 'Bia', avatarUrl: null };
const matrix = { kind: 'movie' as const, externalId: '603', title: 'Matrix', posterUrl: null, year: 1999 };
const post: SocialPost = {
  id: '6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b', author: bia, work: { id: 'w1', ...matrix },
  caption: 'Revi hoje', hasSpoiler: false, likeCount: 1, replyCount: 0, createdAt: now, likedByMe: false, isMine: false,
};

describe('TimelineItem', () => {
  it('a post shows as a post card', () => {
    render(<TimelineItem entry={{ type: 'post', key: 'post:1', createdAt: now, post }} />);
    expect(screen.getByText('Revi hoje')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Curtir (1 curtida)' })).toBeInTheDocument();
  });

  it('a review says who published it and links to the review', () => {
    const entry: TimelineEntry = { type: 'review', key: 'review:1', createdAt: now, actor: bia, work: matrix, href: '/obra/filme/603/topicos/t1', hasSpoiler: false };
    render(<TimelineItem entry={entry} />);
    expect(screen.getByText(/publicou uma resenha de/)).toHaveTextContent('@bia publicou uma resenha de Matrix');
    expect(screen.getByRole('link', { name: 'Matrix' })).toHaveAttribute('href', '/obra/filme/603/topicos/t1');
    expect(screen.getByRole('link', { name: '@bia' })).toHaveAttribute('href', '/@bia');
  });

  it('a reply names the conversation and shows a snippet', () => {
    const entry: TimelineEntry = {
      type: 'reply', key: 'reply:1', createdAt: now, actor: bia, conversation: 'Sobre o final', href: '/obra/filme/603/topicos/t1',
      body: 'Eu acho que o final é aberto.', hasSpoiler: false,
    };
    render(<TimelineItem entry={entry} />);
    expect(screen.getByText(/respondeu em/)).toHaveTextContent('@bia respondeu em Sobre o final');
    expect(screen.getByRole('link', { name: 'Sobre o final' })).toHaveAttribute('href', '/obra/filme/603/topicos/t1');
    expect(screen.getByText('Eu acho que o final é aberto.')).toBeInTheDocument();
  });

  it('a spoiler reply stays hidden until asked; long replies are cut', () => {
    const entry: TimelineEntry = {
      type: 'reply', key: 'reply:2', createdAt: now, actor: bia, conversation: 'publicação sobre Matrix', href: '/p/x',
      body: `Ele morre${'!'.repeat(400)}`, hasSpoiler: true,
    };
    render(<TimelineItem entry={entry} />);
    expect(screen.queryByText(/Ele morre/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Contém spoiler — mostrar' }));
    expect(screen.getByText(/Ele morre/).textContent!.length).toBeLessThanOrEqual(281);
  });
});

describe('TimelineEmpty', () => {
  it('suggests people to follow and busy communities', () => {
    render(<TimelineEmpty
      people={[{ ...bia, recentPosts: 4 }]}
      communities={[{ work: matrix, topics: 2, posts: 3 }]} />);
    expect(screen.getByRole('heading', { name: 'Sua timeline está vazia por enquanto' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bia/ })).toHaveAttribute('href', '/@bia');
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comunidades movimentadas da semana' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Matrix/ })).toHaveAttribute('href', '/obra/filme/603#comunidade');
    expect(screen.getByText('2 tópicos · 3 publicações')).toBeInTheDocument();
  });

  it('still helps when there is nothing to suggest', () => {
    render(<TimelineEmpty people={[]} communities={[]} />);
    expect(screen.getByRole('link', { name: 'Buscar obras' })).toHaveAttribute('href', '/busca');
    expect(screen.queryByRole('heading', { name: 'Comunidades movimentadas da semana' })).toBeNull();
  });
});
