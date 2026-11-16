'use client';

import { useActionState, useState, useTransition, type FormEvent, type KeyboardEvent } from 'react';
import { KindTag } from '@/components/KindTag';
import type { SearchHit } from '@/lib/catalog/types';
import { createPost, searchWorks, type PostActionState } from '@/lib/social/actions';
import { CAPTION_MAX } from '@/lib/social/limits';
import type { PostWork } from '@/lib/social/types';
import { WorkChip } from './WorkChip';

const input = 'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-fg';
const NEED_WORK = 'Escolha um filme, série ou livro';

type Picked = Omit<PostWork, 'id'> & { id?: string };

/** New post: the work it talks about (fixed, or picked from the search), caption and spoiler mark. */
export function PostComposer({ work }: { work?: PostWork }) {
  const [state, formAction, pending] = useActionState<PostActionState, FormData>(createPost, {});
  const [picked, setPicked] = useState<Picked | null>(work ?? null);
  const [caption, setCaption] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!picked) {
      e.preventDefault();
      setLocalError(NEED_WORK);
    }
  }

  const err = state.fieldErrors ?? {};
  const workError = localError ?? err.work;
  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-5">
      {picked?.id ? <input type="hidden" name="workId" value={picked.id} /> : picked && (
        <>
          <input type="hidden" name="kind" value={picked.kind} />
          <input type="hidden" name="externalId" value={picked.externalId} />
        </>
      )}

      {picked ? (
        <div className="flex flex-wrap items-center gap-3">
          <WorkChip work={picked} />
          {!work && (
            <button type="button" onClick={() => setPicked(null)} className="text-sm text-muted underline hover:text-fg">Trocar obra</button>
          )}
        </div>
      ) : (
        <WorkPicker onPick={(hit) => { setPicked(hit); setLocalError(null); }} />
      )}
      {workError && <p role="alert" className="text-sm text-danger">{workError}</p>}

      <div className="space-y-1">
        <label htmlFor="post-caption" className="block text-sm font-medium">Legenda</label>
        <textarea id="post-caption" name="caption" required maxLength={CAPTION_MAX} rows={5} value={caption} onChange={(e) => setCaption(e.target.value)}
          placeholder="O que você achou? Sem spoiler aqui, a não ser que marque abaixo." className={input} />
        <span className="flex justify-between text-xs text-muted">
          <span>{err.caption && <span role="alert" className="text-danger">{err.caption}</span>}</span>
          <span>{caption.length}/{CAPTION_MAX}</span>
        </span>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="hasSpoiler" />
        <span>Contém spoiler</span>
      </label>

      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-full bg-fg px-6 py-2 font-semibold text-bg disabled:opacity-60">
        Publicar
      </button>
    </form>
  );
}

/** Searches the catalog without leaving the page. Lives inside the post form, so it has no form of its own. */
function WorkPicker({ onPick }: { onPick: (w: Picked) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    const query = q.trim();
    if (query.length < 2) return setError('Digite pelo menos 2 letras.');
    setError(null);
    startTransition(async () => {
      const r = await searchWorks(query);
      setHits(r.hits);
      setError(r.error ?? null);
    });
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="work-search" className="block text-sm font-medium">Sobre qual obra?</label>
      <div className="flex gap-2">
        <input id="work-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
          placeholder="Busque um filme, série ou livro" className={`${input} min-w-0 flex-1`} />
        <button type="button" onClick={search} disabled={pending} className="rounded-lg border border-line-strong px-4 font-semibold hover:bg-surface-2 disabled:opacity-60">
          Buscar
        </button>
      </div>
      {error && <p className="text-sm text-warn">{error}</p>}
      {hits && hits.length === 0 && !error && <p className="text-sm text-muted">Nada encontrado para “{q.trim()}”.</p>}
      {hits && hits.length > 0 && (
        <ul className="grid gap-1 sm:grid-cols-2">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.externalId}`}>
              <button type="button" onClick={() => onPick(h)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface-2">
                {h.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.posterUrl} alt="" width={32} height={48} loading="lazy" className="h-12 w-8 shrink-0 rounded object-cover" />
                ) : (
                  <span className="h-12 w-8 shrink-0 rounded bg-surface-2" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{h.title}</span>
                  <span className="flex items-center gap-2 text-xs text-muted"><KindTag kind={h.kind} />{h.year && <span>{h.year}</span>}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
