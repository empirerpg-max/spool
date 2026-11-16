import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserMenuView } from '@/components/UserMenuView';

describe('UserMenuView', () => {
  it('keeps the phone header to two short items', () => {
    render(<UserMenuView path="/" user={{ id: 'u', username: 'leitora_voraz22', isAdmin: true, banned: false }} />);
    expect(screen.getByText('@leitora_voraz22')).toHaveClass('hidden', 'sm:inline');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveClass('hidden', 'sm:inline');
    expect(screen.getByRole('link', { name: 'Minha lista' })).not.toHaveClass('hidden');
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });
  it('links to the public profile when there is a username', () => {
    render(<UserMenuView path="/" user={{ id: 'u', username: 'ana', isAdmin: false, banned: false }} />);
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveAttribute('href', '/@ana');
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveClass('hidden', 'sm:inline');
  });
  it('links to the timeline (icon on phones) and to publishing (larger screens)', () => {
    render(<UserMenuView path="/" user={{ id: 'u', username: 'ana', isAdmin: false, banned: false }} />);
    const timeline = screen.getByRole('link', { name: 'Timeline' });
    expect(timeline).toHaveAttribute('href', '/timeline');
    expect(timeline).not.toHaveClass('hidden');
    expect(screen.getByRole('link', { name: 'Publicar' })).toHaveAttribute('href', '/publicar');
    expect(screen.getByRole('link', { name: 'Publicar' })).toHaveClass('hidden', 'md:inline');
  });
  it('no Publicar link before choosing a username', () => {
    render(<UserMenuView path="/" user={{ id: 'u', username: null, isAdmin: false, banned: false }} />);
    expect(screen.queryByRole('link', { name: 'Publicar' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Timeline' })).toBeInTheDocument();
  });
  it('has no profile link before choosing a username', () => {
    render(<UserMenuView path="/" user={{ id: 'u', username: null, isAdmin: false, banned: false }} />);
    expect(screen.queryByRole('link', { name: 'Meu perfil' })).toBeNull();
  });
  it('shows a sign-in button when signed out', () => {
    render(<UserMenuView path="/obra/filme/603" user={null} />);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?next=%2Fobra%2Ffilme%2F603');
  });
});
