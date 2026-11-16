'use client';

import { useEffect, useState } from 'react';
import { removePushSubscription, savePushSubscription } from '@/lib/alerts/actions';

export type PushSupport = 'unsupported' | 'ios-install' | 'denied' | 'ready' | 'enabled';

export function pushSupport(env: { hasServiceWorker: boolean; hasPush: boolean; isIOS: boolean; standalone: boolean; permission: NotificationPermission | 'unavailable' }): PushSupport {
  if (env.isIOS && !env.standalone) return 'ios-install';
  if (!env.hasServiceWorker || !env.hasPush) return 'unsupported';
  if (env.permission === 'denied') return 'denied';
  return 'ready';
}

function detect(): PushSupport {
  const nav = navigator as Navigator & { standalone?: boolean };
  return pushSupport({
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPush: 'PushManager' in window,
    isIOS: /iPhone|iPad|iPod/.test(navigator.userAgent),
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true,
    permission: 'Notification' in window ? Notification.permission : 'unavailable',
  });
}

const toKey = (base64: string) => {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function EnablePush({ initialSupport }: { initialSupport?: PushSupport }) {
  const [state, setState] = useState<PushSupport | null>(initialSupport ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialSupport) return;
    const s = detect();
    if (s !== 'ready') return setState(s);
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      setState((await reg?.pushManager.getSubscription()) ? 'enabled' : 'ready');
    }).catch(() => setState('ready'));
  }, [initialSupport]);

  async function enable() {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== 'granted') return setState('denied');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch('/api/avisos/chave')).json();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const { ok } = await savePushSubscription(json);
      setState(ok ? 'enabled' : 'ready');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await (await navigator.serviceWorker.getRegistration('/sw.js'))?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState('ready');
    } finally {
      setBusy(false);
    }
  }

  const box = 'rounded-xl border border-line bg-surface p-4 text-sm';
  if (state === null) return null;
  if (state === 'unsupported') return <p className={box}>Seu navegador não aceita notificações. Os avisos continuam aparecendo aqui no site.</p>;
  if (state === 'ios-install') {
    return <p className={box}>No iPhone, primeiro adicione o Lobby à tela de início (botão Compartilhar → “Adicionar à Tela de Início”) e abra por lá para ativar os avisos.</p>;
  }
  if (state === 'denied') return <p className={box}>As notificações estão bloqueadas nas configurações do navegador.</p>;
  if (state === 'enabled') {
    return (
      <div className={`${box} flex flex-wrap items-center gap-3`}>
        <span className="text-success">Avisos ativados neste aparelho.</span>
        <button type="button" onClick={disable} disabled={busy} className="text-muted underline">Desativar</button>
      </div>
    );
  }
  return (
    <div className={`${box} flex flex-wrap items-center gap-3`}>
      <span>Receba os avisos também como notificação no celular ou no computador.</span>
      <button type="button" onClick={enable} disabled={busy} className="rounded-full bg-fg px-4 py-1.5 font-semibold text-bg disabled:opacity-60">
        Ativar avisos no celular
      </button>
    </div>
  );
}
