import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/browser', () => ({ createBrowserSupabase: () => ({ auth: {} }) }));
import { LoginForm } from '@/app/entrar/LoginForm';

describe('LoginForm', () => {
  it('offers e-mail link login', () => {
    render(<LoginForm next="/" googleEnabled={false} />);
    expect(screen.getByRole('button', { name: 'Receber link de acesso' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar com Google' })).toBeNull();
  });
  it('offers Google only when enabled', () => {
    render(<LoginForm next="/" googleEnabled />);
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument();
  });
});
