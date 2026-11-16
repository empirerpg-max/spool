import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth/actions', () => ({ signIn: vi.fn(), signUp: vi.fn() }));
import { LoginForm } from '@/app/entrar/LoginForm';
import { SignUpForm } from '@/app/criar-conta/SignUpForm';

describe('LoginForm', () => {
  it('asks for e-mail and password and links to sign-up', () => {
    render(<LoginForm next="/obra/filme/603" />);
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/criar-conta');
    expect(screen.queryByText(/Google/)).toBeNull();
  });
  it('explains how to recover a password', () => {
    render(<LoginForm next="/" />);
    fireEvent.click(screen.getByText('Esqueci minha senha'));
    expect(screen.getByText('Peça para a equipe do Lobby redefinir sua senha.')).toBeInTheDocument();
  });
});

describe('SignUpForm', () => {
  it('has every field in order, with terms and privacy links', () => {
    render(<SignUpForm inviteRequired />);
    for (const label of ['Nome', 'Sobrenome', 'Data de nascimento', 'E-mail', 'Senha', 'Confirmar senha', 'Código de convite']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('checkbox', { name: /Li e aceito os Termos de Uso/ })).toBeRequired();
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument();
  });
  it('hides the invite field when it is not needed (first account)', () => {
    render(<SignUpForm inviteRequired={false} />);
    expect(screen.queryByLabelText('Código de convite')).toBeNull();
  });
});
