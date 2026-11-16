'use client';

import { useActionState } from 'react';
import { createImport, type ImportStartState } from '@/lib/import/actions';

export function ImportUploader({ source, multiple }: { source: 'letterboxd' | 'goodreads'; multiple: boolean }) {
  const [state, action, pending] = useActionState<ImportStartState, FormData>(createImport.bind(null, source), {});
  return (
    <form action={action} className="space-y-3">
      <input type="file" name="files" accept=".csv,text/csv" multiple={multiple} required aria-label={`Arquivo${multiple ? 's' : ''} CSV`} className="block w-full text-sm" />
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-fg px-4 py-2 font-semibold text-bg disabled:opacity-60">
        {pending ? 'Enviando…' : 'Importar'}
      </button>
    </form>
  );
}
