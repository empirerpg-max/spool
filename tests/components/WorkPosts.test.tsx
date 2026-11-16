import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/social/actions', () => ({ likePost: vi.fn(), unlikePost: vi.fn() }));

import { WorkPosts } from '@/components/social/WorkPosts';
import type { SocialPost } from '@/lib/social/types';

const post: SocialPost = {
  id: '6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b', author: { id: 'a', username: 'ana', displayName: null, avatarUrl: null },
  work: { id: 'w1', kind: 'movie', externalId: '603', title: 'Matrix', posterUrl: null, year: 1999 },
  caption: 'Que filme', hasSpoiler: false, likeCount: 0, replyCount: 0, createdAt: new Date().toISOString(), likedByMe: false, isMine: false,
};

describe('WorkPosts', () => {
  it('signed out: asks to sign in, shows no posts', () => {
    render(<WorkPosts workId="w1" workPath="/obra/filme/603" signedIn={false} posts={[]} hasMore={false} page={1} />);
    expect(screen.getByRole('link', { name: 'Entre para ver as publicações dos membros' }))
      .toHaveAttribute('href', '/entrar?next=%2Fobra%2Ffilme%2F603');
    expect(screen.queryByRole('link', { name: 'Publicar sobre esta obra' })).toBeNull();
  });

  it('signed in: posts and a button to publish about the work', () => {
    render(<WorkPosts workId="w1" workPath="/obra/filme/603" signedIn posts={[post]} hasMore page={1} />);
    expect(screen.getByRole('link', { name: 'Publicar sobre esta obra' })).toHaveAttribute('href', '/publicar?obra=w1');
    expect(screen.getByText('Que filme')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mais publicações' })).toHaveAttribute('href', '/obra/filme/603?publicacoes=2#publicacoes');
  });

  it('signed in, nothing yet: invites the first post', () => {
    render(<WorkPosts workId="w1" workPath="/obra/filme/603" signedIn posts={[]} hasMore={false} page={1} />);
    expect(screen.getByText('Ninguém publicou sobre esta obra ainda.')).toBeInTheDocument();
  });
});
