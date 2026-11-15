'use client';

import { useActionState } from 'react';
import { createImport, type ImportStartState } from '@/lib/import/actions';

export function ImportUploader({ source, multiple }: { source: 'letterboxd' | 'goodreads'; multiple: boolean }) {
  const [state, action, pending] = useActionState<ImportStartState, FormData>(createImport.bind(null, source), {});
  return (
    <form action={action} className="space-y-3">
      <input type="file" name="files" accept=".csv,text/csv" multiple={multiple} required aria-label={`Arquivo${multiple ? 's' : ''} CSV`} className="block w-full text-sm" />
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">
        {pending ? 'Enviando…' : 'Importar'}
      </button>
    </form>
  );
}
