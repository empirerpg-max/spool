import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const actions = vi.hoisted(() => ({
  follow: vi.fn(async () => ({ ok: true })), unfollow: vi.fn(async () => ({ ok: true })),
  block: vi.fn(async () => ({ ok: true })), unblock: vi.fn(async () => ({ ok: true })),
  mute: vi.fn(async () => ({ ok: true })), unmute: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/social/actions', () => actions);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { ProfileHeader } from '@/components/social/ProfileHeader';
import type { ProfileView } from '@/lib/social/queries';

const profile = (over: Partial<ProfileView> = {}): ProfileView => ({
  id: '6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b', username: 'ana', displayName: 'Ana Lê', bio: 'Terror e romances russos.',
  avatarUrl: null, listPublic: false, followers: 12, following: 1, posts: 3,
  isMe: false, isFollowing: false, iBlocked: false, iMuted: false, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('ProfileHeader', () => {
  it('shows name, @, bio and counts linking to the people lists', () => {
    render(<ProfileHeader profile={profile()} />);
    expect(screen.getByRole('heading', { name: 'Ana Lê' })).toBeInTheDocument();
    expect(screen.getByText('@ana')).toBeInTheDocument();
    expect(screen.getByText('Terror e romances russos.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '12 seguidores' })).toHaveAttribute('href', '/@ana/seguidores');
    expect(screen.getByRole('link', { name: '1 seguindo' })).toHaveAttribute('href', '/@ana/seguindo');
    expect(screen.getByText('3 publicações')).toBeInTheDocument();
  });

  it('uses singular counts and falls back to the @ when there is no name', () => {
    render(<ProfileHeader profile={profile({ displayName: null, followers: 1, posts: 1 })} />);
    expect(screen.getByRole('heading', { name: '@ana' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '1 seguidor' })).toBeInTheDocument();
    expect(screen.getByText('1 publicação')).toBeInTheDocument();
  });

  it('own profile: edit link, no follow or menu', () => {
    render(<ProfileHeader profile={profile({ isMe: true })} />);
    expect(screen.getByRole('link', { name: 'Editar perfil' })).toHaveAttribute('href', '/minha-conta#perfil');
    expect(screen.queryByRole('button', { name: 'Seguir' })).toBeNull();
    expect(screen.queryByText('Mais opções')).toBeNull();
  });

  it('someone else: Seguir button calls follow', async () => {
    render(<ProfileHeader profile={profile()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(actions.follow).toHaveBeenCalledWith('6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b', '/perfil/ana');
    expect(await screen.findByRole('button', { name: 'Seguindo' })).toBeInTheDocument();
  });

  it('already following: Seguindo button unfollows', async () => {
    render(<ProfileHeader profile={profile({ isFollowing: true })} />);
    const btn = screen.getByRole('button', { name: 'Seguindo' });
    expect(btn).toHaveAttribute('title', 'Deixar de seguir');
    fireEvent.click(btn);
    expect(actions.unfollow).toHaveBeenCalled();
  });

  it('menu offers silence and block, block asks first', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProfileHeader profile={profile()} />);
    expect(screen.getByRole('button', { name: 'Silenciar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }));
    expect(confirm).toHaveBeenCalledWith('Bloquear @ana? Vocês deixam de se seguir e não verão o que o outro publica.');
    expect(actions.block).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('muted: menu offers to stop silencing', () => {
    render(<ProfileHeader profile={profile({ iMuted: true })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Deixar de silenciar' }));
    expect(actions.unmute).toHaveBeenCalledWith('6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b', '/perfil/ana');
  });

  it('you blocked them: says so, offers Desbloquear, hides follow, bio and counts', () => {
    render(<ProfileHeader profile={profile({ iBlocked: true })} />);
    expect(screen.getByText('Você bloqueou @ana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seguir' })).toBeNull();
    expect(screen.queryByText('Terror e romances russos.')).toBeNull();
    expect(screen.queryByText(/seguidores/)).toBeNull();
  });
});
