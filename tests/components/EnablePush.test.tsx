import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/alerts/actions', () => ({ savePushSubscription: vi.fn(), removePushSubscription: vi.fn() }));
import { pushSupport, EnablePush } from '@/components/alerts/EnablePush';

describe('pushSupport', () => {
  it('detects unsupported browsers, iPhone without install, blocked and ready', () => {
    expect(pushSupport({ hasServiceWorker: false, hasPush: false, isIOS: false, standalone: false, permission: 'default' })).toBe('unsupported');
    expect(pushSupport({ hasServiceWorker: true, hasPush: false, isIOS: true, standalone: false, permission: 'default' })).toBe('ios-install');
    expect(pushSupport({ hasServiceWorker: true, hasPush: true, isIOS: false, standalone: false, permission: 'denied' })).toBe('denied');
    expect(pushSupport({ hasServiceWorker: true, hasPush: true, isIOS: true, standalone: true, permission: 'default' })).toBe('ready');
  });
});

describe('EnablePush', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('explains how to install on iPhone', () => {
    render(<EnablePush initialSupport="ios-install" />);
    expect(screen.getByText(/No iPhone, primeiro adicione o Lobby à tela de início/)).toBeInTheDocument();
  });
  it('offers the button when ready', () => {
    render(<EnablePush initialSupport="ready" />);
    expect(screen.getByRole('button', { name: 'Ativar avisos no celular' })).toBeInTheDocument();
  });
  it('explains a blocked browser', () => {
    render(<EnablePush initialSupport="denied" />);
    expect(screen.getByText('As notificações estão bloqueadas nas configurações do navegador.')).toBeInTheDocument();
  });
});
