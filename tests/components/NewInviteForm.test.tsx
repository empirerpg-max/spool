import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/admin/accounts', () => ({ createInvite: vi.fn(), resetPassword: vi.fn(), changeMyPassword: vi.fn() }));
import { NewInviteForm } from '@/app/admin/convites/NewInviteForm';
import { InviteList } from '@/app/admin/convites/InviteList';

describe('NewInviteForm', () => {
  it('offers an optional note and a create button', () => {
    render(<NewInviteForm />);
    expect(screen.getByLabelText('Para quem é (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar convite' })).toBeInTheDocument();
  });
});

describe('InviteList', () => {
  it('shows available and used invites', () => {
    render(<InviteList invites={[
      { code: 'AB3DEFG7', note: 'Bia', createdAt: '2026-11-16T12:00:00Z', usedBy: null, usedAt: null },
      { code: 'ZX9KPQR2', note: null, createdAt: '2026-11-15T12:00:00Z', usedBy: 'cris', usedAt: '2026-11-16T10:00:00Z' },
    ]} />);
    expect(screen.getByText('AB3DEFG7')).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    expect(screen.getByText('Usado por @cris em 16/11/2026')).toBeInTheDocument();
  });
  it('explains the empty state', () => {
    render(<InviteList invites={[]} />);
    expect(screen.getByText('Nenhum convite gerado ainda.')).toBeInTheDocument();
  });
});
