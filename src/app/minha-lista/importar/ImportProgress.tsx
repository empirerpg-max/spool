'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { processImportBatch, type ImportCounts } from '@/lib/import/actions';

const RETRY_MS = 5000;

export function ImportProgress({ importId, initial }: { importId: string; initial: ImportCounts }) {
  const router = useRouter();
  const [counts, setCounts] = useState(initial);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (initial.pending === 0) return;
    let stop = false;
    (async () => {
      let pending = initial.pending;
      while (!stop && pending > 0) {
        try {
          const r = await processImportBatch(importId);
          if (stop) return;
          setCounts(r);
          setPaused(r.retryLater);
          pending = r.pending;
          if (r.retryLater) await new Promise((res) => setTimeout(res, RETRY_MS));
        } catch {
          setPaused(true);
          await new Promise((res) => setTimeout(res, RETRY_MS));
        }
      }
      if (!stop) router.refresh();
    })();
    return () => { stop = true; };
  }, [importId, initial.pending, router]);

  const done = counts.total - counts.pending;
  if (counts.pending === 0) {
    return <p role="status" className="text-lg">Pronto! {counts.imported} {counts.imported === 1 ? 'item importado' : 'itens importados'}.</p>;
  }
  return (
    <div role="status" className="space-y-2">
      <p>Importando… {done} de {counts.total}</p>
      <progress value={done} max={counts.total} className="w-full" />
      {paused && <p className="text-sm text-warn">O catálogo está demorando para responder. Vamos tentar de novo em instantes.</p>}
      <p className="text-sm text-muted">Pode fechar esta página: quando voltar, continuamos de onde parou.</p>
    </div>
  );
}
