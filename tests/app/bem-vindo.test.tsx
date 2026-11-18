import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }) }));
vi.mock('@/lib/auth/current-user', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'u1', username: null, isAdmin: false, banned: false })),
}));
vi.mock('@/lib/social/queries', () => ({ getShareActivity: vi.fn(async () => null) }));
vi.mock('@/app/bem-vindo/UsernameForm', () => ({ UsernameForm: () => <form aria-label="Nome de usuário" /> }));

import WelcomePage from '@/app/bem-vindo/page';

describe('/bem-vindo', () => {
  it('lets someone without an @ reach Minha conta and sign out (phones have no photo menu)', async () => {
    render(await WelcomePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/minha-conta');
    const signOut = screen.getByRole('button', { name: 'Sair' });
    expect(signOut).toHaveAttribute('type', 'submit');
    expect(signOut.closest('form')).toHaveAttribute('action', '/sair');
    expect(signOut.closest('form')).toHaveAttribute('method', 'post');
  });
});
