import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setShareActivity = vi.hoisted(() => vi.fn<(share: boolean) => Promise<{ ok: boolean }>>(async () => ({ ok: true })));
vi.mock('@/lib/social/profile-actions', () => ({ setShareActivity }));
import { ShareActivityBanner } from '@/components/social/ShareActivityBanner';

const QUESTION = 'Mostrar sua atividade para quem te segue? Assim seus amigos veem o que você viu e quer ver.';

describe('ShareActivityBanner', () => {
  beforeEach(() => setShareActivity.mockClear());

  it('"Sim, mostrar" turns sharing on and hides the question', async () => {
    render(<ShareActivityBanner />);
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, mostrar' }));
    await waitFor(() => expect(screen.queryByText(QUESTION)).toBeNull());
    expect(setShareActivity).toHaveBeenCalledWith(true);
  });

  it('"Agora não" turns it off for good and hides the question', async () => {
    render(<ShareActivityBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    await waitFor(() => expect(screen.queryByText(QUESTION)).toBeNull());
    expect(setShareActivity).toHaveBeenCalledWith(false);
  });

  it('keeps the question and explains when saving fails', async () => {
    setShareActivity.mockResolvedValueOnce({ ok: false });
    render(<ShareActivityBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Sim, mostrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar. Tente de novo.');
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
  });
});
