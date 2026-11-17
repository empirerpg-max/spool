'use client';

import Link from 'next/link';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { ListAddIcon, PenIcon } from './icons';

type Props = {
  id: string;
  /** Phones: a sheet over the page that keeps the keyboard inside it. Computers: a small panel under the button. */
  modal: boolean;
  canPublish: boolean;
  /** `returnFocus: false` when focus already moved on by itself (Tab out of the computer panel). */
  onClose: (opts?: { returnFocus?: boolean }) => void;
};

const OPTION = 'flex min-h-14 items-center gap-4 rounded-xl px-4 py-3 font-semibold hover:bg-surface-2 focus-visible:bg-surface-2';
const BADGE = 'flex size-10 shrink-0 items-center justify-center rounded-full';

/**
 * The "+" menu. On phones a sheet rising from the bottom: a real modal (Tab goes round inside it) with a
 * "Fechar" button. On computers a small panel under the button that doesn't trap the keyboard; leaving it
 * with Tab closes it. Escape, the backdrop or choosing an option closes either one.
 */
export function CreateSheet({ id, modal, canPublish, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const options = (
    <ul className="space-y-1">
      {canPublish && (
        <li>
          <Link href="/publicar" onClick={() => onClose()} className={OPTION}>
            <span aria-hidden="true" className={`${BADGE} bg-film/15 text-film`}><PenIcon className="size-5" /></span>
            Publicar sobre uma obra
          </Link>
        </li>
      )}
      <li>
        <Link href="/explorar?foco=busca" onClick={() => onClose()} className={OPTION}>
          <span aria-hidden="true" className={`${BADGE} bg-livro/15 text-livro`}><ListAddIcon className="size-5" /></span>
          Adicionar à minha lista
        </Link>
      </li>
    </ul>
  );

  if (!modal) {
    return (
      <div ref={panel} id={id} role="group" aria-label="Criar"
        onBlur={(e) => {
          // Tab past the last option (or back before the first) closes it; the "+" button toggles it by itself.
          const to = e.relatedTarget as Node | null;
          if (to && !e.currentTarget.parentElement?.contains(to)) onClose({ returnFocus: false });
        }}
        className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-line bg-surface px-3 py-2 shadow-xl shadow-black/40">
        <p aria-hidden="true" className="px-4 pb-1 pt-1 font-display text-sm font-bold text-muted">Criar</p>
        {options}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => onClose()} className="absolute inset-0 bg-black/60" />
      <div ref={panel} id={id} role="dialog" aria-modal="true" aria-label="Criar" onKeyDown={trapTab}
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl motion-safe:animate-[sheet-up_180ms_ease-out]">
        <div aria-hidden="true" className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-line-strong" />
        <p aria-hidden="true" className="px-4 pb-1 pt-1 font-display text-sm font-bold text-muted">Criar</p>
        {options}
        <button type="button" onClick={() => onClose()}
          className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl font-semibold text-muted hover:bg-surface-2 hover:text-fg">
          Fechar
        </button>
      </div>
    </div>
  );
}
