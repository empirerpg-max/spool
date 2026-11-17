'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { clearAllAlerts } from '@/lib/alerts/actions';

export function ClearAlertsButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const onClick = () => {
    if (!window.confirm('Apagar todos os seus avisos? Isso não pode ser desfeito.')) return;
    start(async () => {
      const { ok } = await clearAllAlerts();
      setFailed(!ok);
      if (ok) router.refresh();
    });
  };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onClick} disabled={pending}
        className="min-h-11 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface disabled:opacity-60">
        Limpar avisos
      </button>
      {failed && <p role="alert" className="text-sm text-danger">Não foi possível limpar agora. Tente de novo.</p>}
    </div>
  );
}
