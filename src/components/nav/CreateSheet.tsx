'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ListAddIcon, PenIcon } from './icons';

type Props = { canPublish: boolean; onClose: () => void };

const OPTION = 'flex min-h-14 items-center gap-4 rounded-xl px-4 py-3 font-semibold hover:bg-surface-2 focus-visible:bg-surface-2';
const BADGE = 'flex size-10 shrink-0 items-center justify-center rounded-full';

/**
 * The "+" menu: a sheet rising from the bottom on phones, a small panel under the button on computers.
 * Escape, the backdrop or choosing an option closes it.
 */
export function CreateSheet({ canPublish, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2">
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={onClose}
        className="absolute inset-0 bg-black/60 md:hidden" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Criar"
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl motion-safe:animate-[sheet-up_180ms_ease-out] md:static md:w-80 md:rounded-2xl md:border md:pb-2 md:shadow-xl md:shadow-black/40 md:motion-safe:animate-none">
        <div aria-hidden="true" className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-line-strong md:hidden" />
        <p className="px-4 pb-1 pt-1 font-display text-sm font-bold text-muted">Criar</p>
        <ul className="space-y-1">
          {canPublish && (
            <li>
              <Link href="/publicar" onClick={onClose} className={OPTION}>
                <span aria-hidden="true" className={`${BADGE} bg-film/15 text-film`}><PenIcon className="size-5" /></span>
                Publicar sobre uma obra
              </Link>
            </li>
          )}
          <li>
            <Link href="/explorar?foco=busca" onClick={onClose} className={OPTION}>
              <span aria-hidden="true" className={`${BADGE} bg-livro/15 text-livro`}><ListAddIcon className="size-5" /></span>
              Adicionar à minha lista
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
