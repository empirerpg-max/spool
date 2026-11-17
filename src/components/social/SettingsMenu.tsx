'use client';

import { GearIcon } from '@/components/nav/icons';
import { MenuButton, type MenuEntry } from '@/components/nav/ProfileMenu';

/** Gear on your own profile: Minha conta, Admin (admins only) and Sair — on phones these have no other place. */
export function SettingsMenu({ isAdmin }: { isAdmin: boolean }) {
  const items: MenuEntry[] = [
    { label: 'Minha conta', href: '/minha-conta' },
    ...(isAdmin ? [{ label: 'Admin', href: '/admin' }] : []),
    { label: 'Sair', signOut: true as const },
  ];
  return (
    <MenuButton label="Configurações" items={items} trigger={<GearIcon className="size-5" />}
      buttonClassName="flex size-11 items-center justify-center rounded-full border border-line-strong text-muted hover:bg-surface-2 hover:text-fg aria-expanded:bg-surface-2 aria-expanded:text-fg" />
  );
}
