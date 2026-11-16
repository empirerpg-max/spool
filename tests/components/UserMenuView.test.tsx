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
  it('shows a sign-in button when signed out', () => {
    render(<UserMenuView path="/obra/filme/603" user={null} />);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?next=%2Fobra%2Ffilme%2F603');
  });
});
