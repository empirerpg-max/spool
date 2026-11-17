'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Avatar } from '@/components/social/Avatar';

export type MenuEntry = { label: string; href: string } | { label: string; signOut: true };

type MenuButtonProps = {
  label: string;
  trigger: ReactNode;
  items: MenuEntry[];
  buttonClassName: string;
  /** Shown above the items (e.g. the @ of the account). */
  heading?: ReactNode;
};

const ITEM = 'flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium hover:bg-surface-2 focus-visible:bg-surface-2';

/** A button that opens a small menu of links (and "Sair"); closes on Escape, outside click or choosing an item. */
export function MenuButton({ label, trigger, items, buttonClassName, heading }: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent | MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  // Arrow keys move between items, as in any menu.
  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const all = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const at = all.indexOf(document.activeElement as HTMLElement);
    all[(at + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length]?.focus();
  };

  return (
    <div ref={root} className="relative">
      <button ref={button} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)} className={buttonClassName}>
        {trigger}
      </button>
      {open && (
        <div ref={menu} id={id} role="menu" aria-label={label} onKeyDown={onMenuKey}
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-black/40">
          {heading && <div className="truncate px-3 pb-2 pt-1.5 text-xs text-muted">{heading}</div>}
          {items.map((it) =>
            'href' in it ? (
              <Link key={it.label} role="menuitem" href={it.href} onClick={() => setOpen(false)} className={ITEM}>{it.label}</Link>
            ) : (
              <form key={it.label} action="/sair" method="post" className="mt-1 border-t border-line pt-1">
                <button role="menuitem" type="submit" className={`${ITEM} text-muted hover:text-fg`}>{it.label}</button>
              </form>
            ),
          )}
        </div>
      )}
    </div>
  );
}

type ProfileMenuProps = { username: string | null; avatarUrl: string | null; isAdmin: boolean };

/** Computer only: the profile photo in the top bar opens Meu perfil, Minha lista, Minha conta, Admin and Sair. */
export function ProfileMenu({ username, avatarUrl, isAdmin }: ProfileMenuProps) {
  const items: MenuEntry[] = [
    { label: 'Meu perfil', href: username ? `/@${username}` : '/bem-vindo' },
    { label: 'Minha lista', href: '/minha-lista' },
    { label: 'Minha conta', href: '/minha-conta' },
    ...(isAdmin ? [{ label: 'Admin', href: '/admin' }] : []),
    { label: 'Sair', signOut: true as const },
  ];
  return (
    <MenuButton label="Menu da conta" items={items} heading={username ? `@${username}` : 'Escolha seu nome no Lobby'}
      buttonClassName="flex size-11 items-center justify-center rounded-full hover:bg-surface-2 aria-expanded:bg-surface-2"
      trigger={<Avatar url={avatarUrl} name={username ?? ''} size="sm" />} />
  );
}
