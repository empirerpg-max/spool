import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/admin/accounts', () => ({ changeMyPassword: vi.fn() }));
import { ChangePasswordForm } from '@/app/minha-conta/ChangePasswordForm';

describe('ChangePasswordForm', () => {
  it('asks for the current password before a new one', () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText('Senha atual')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });
});
