'use client';

import { useState, useTransition } from 'react';
import { setShareActivity } from '@/lib/social/profile-actions';

/**
 * Asked once to members who never answered (Início and Timeline). "Agora não" saves "no", so it never
 * comes back; both answers can be changed later in Minha conta.
 */
export function ShareActivityBanner() {
  const [answered, setAnswered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  if (answered) return null;

  const answer = (share: boolean) => start(async () => {
    const r = await setShareActivity(share);
    if (r.ok) setAnswered(true);
    else setFailed(true);
  });

  return (
    <aside aria-label="Sua atividade" className="space-y-3 rounded-2xl border border-line-strong bg-surface p-4">
      <p>Mostrar sua atividade para quem te segue? Assim seus amigos veem o que você viu e quer ver.</p>
      {failed && <p role="alert" className="text-sm text-danger">Não foi possível salvar. Tente de novo.</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={pending} onClick={() => answer(true)}
          className="rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg disabled:opacity-60">
          Sim, mostrar
        </button>
        <button type="button" disabled={pending} onClick={() => answer(false)}
          className="rounded-full border border-line-strong px-5 py-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60">
          Agora não
        </button>
      </div>
    </aside>
  );
}
