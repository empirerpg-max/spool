import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const clearAllAlerts = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
const refresh = vi.hoisted(() => vi.fn());
vi.mock('@/lib/alerts/actions', () => ({ clearAllAlerts }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { ClearAlertsButton } from '@/components/alerts/ClearAlertsButton';

describe('ClearAlertsButton', () => {
  beforeEach(() => { clearAllAlerts.mockClear(); refresh.mockClear(); });

  it('asks first and does nothing when cancelled', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ClearAlertsButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar avisos' }));
    expect(confirm).toHaveBeenCalledWith('Apagar todos os seus avisos? Isso não pode ser desfeito.');
    expect(clearAllAlerts).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('clears and refreshes the page when confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ClearAlertsButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar avisos' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(clearAllAlerts).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });
});
