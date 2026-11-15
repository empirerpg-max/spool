'use client';

import { useActionState } from 'react';
import type { ActionState } from '@/lib/community/actions';

const input = 'w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700';

export function TopicForm({ action, isSeries }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; isSeries: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Título</span>
        <input name="title" required minLength={3} maxLength={120} className={input} />
        <span className="text-xs text-neutral-500">Não coloque spoiler no título.</span>
        {err.title && <span role="alert" className="block text-sm text-red-600">{err.title}</span>}
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Texto</span>
        <textarea name="body" required maxLength={10000} rows={8} className={input} />
        {err.body && <span role="alert" className="block text-sm text-red-600">{err.body}</span>}
      </label>
      <fieldset className="group space-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hasSpoiler" />
          <span>Contém spoiler</span>
        </label>
        {isSeries && (
          <div className="hidden gap-3 group-has-[input:checked]:flex">
            <label className="space-y-1">
              <span className="text-sm">Até a temporada</span>
              <input name="spoilerSeason" type="number" min={1} max={100} className={`${input} w-24`} />
            </label>
            <label className="space-y-1">
              <span className="text-sm">episódio</span>
              <input name="spoilerEpisode" type="number" min={1} max={500} className={`${input} w-24`} />
            </label>
          </div>
        )}
        {err.spoilerSeason && <span role="alert" className="block text-sm text-red-600">{err.spoilerSeason}</span>}
      </fieldset>
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">
        Publicar tópico
      </button>
    </form>
  );
}
