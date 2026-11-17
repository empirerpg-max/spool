'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Avatar } from '@/components/social/Avatar';
import { CreateSheet } from './CreateSheet';
import { BellIcon, ExploreIcon, HomeIcon, PlusIcon, SignInIcon, UserIcon } from './icons';
import { ProfileMenu } from './ProfileMenu';

export type NavUser = { username: string | null; avatarUrl: string | null; isAdmin: boolean; banned: boolean };

/*
 * One list, two layouts: a fixed bar at the bottom on phones (icon over a short label, each item a wide touch target),
 * and a row inside the top bar on computers. The bottom bar pads itself above the iPhone home indicator.
 */
const BAR =
  // Opaque, no backdrop blur: a blur would trap the fixed "Criar" sheet inside the bar.
  'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] ' +
  'md:static md:z-auto md:flex-1 md:border-0 md:bg-transparent md:pb-0';
const LIST = 'mx-auto flex max-w-lg items-stretch md:max-w-none md:items-center md:gap-1';
const ITEM =
  'relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.6875rem] font-medium leading-none ' +
  'md:min-h-11 md:w-auto md:flex-row md:gap-2 md:px-3 md:text-sm';
const tone = (active: boolean) => (active ? 'text-fg md:bg-surface-2' : 'text-muted hover:text-fg');

const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
/** Início is the home and, for members, their Timeline. */
const isHome = (path: string) => path === '/' || isActive(path, '/timeline');

/** Same width as Tailwind's `md:` (48rem): from here on the bar is the computer layout. */
const DESKTOP_QUERY = '(min-width: 48rem)';
function subscribeDesktop(onChange: () => void) {
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY) : null;
  mq?.addEventListener('change', onChange);
  return () => mq?.removeEventListener('change', onChange);
}
const desktopNow = () => (typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY).matches : false);
/** Computer layout? On the server (and the first paint) we assume a phone. */
function useDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, desktopNow, () => false);
}

function unreadLabel(n: number) {
  if (n <= 0) return 'Avisos';
  return n === 1 ? '1 aviso não lido' : `${n} avisos não lidos`;
}

function Label({ children, desktop = true }: { children: ReactNode; desktop?: boolean }) {
  return <span data-label aria-hidden="true" className={desktop ? undefined : 'md:hidden'}>{children}</span>;
}

function TabLink({ href, label, active, icon, desktopLabel = true, ariaLabel }: {
  href: string; label: string; active: boolean; icon: ReactNode; desktopLabel?: boolean; ariaLabel?: string;
}) {
  return (
    <Link href={href} aria-label={ariaLabel ?? label} aria-current={active ? 'page' : undefined} className={`${ITEM} ${tone(active)}`}>
      {icon}
      <Label desktop={desktopLabel}>{label}</Label>
    </Link>
  );
}

function SignInLink({ next }: { next: string }) {
  return (
    <Link href={`/entrar?next=${encodeURIComponent(next)}`} aria-label="Entrar"
      className={`${ITEM} text-muted hover:text-fg md:ml-2 md:min-h-10 md:rounded-full md:bg-fg md:px-5 md:font-semibold md:text-bg md:hover:bg-fg/90 md:hover:text-bg`}>
      <SignInIcon className="size-6 md:hidden" />
      <Label>Entrar</Label>
    </Link>
  );
}

/** The sign-in link keeps the whole address (with ?query) so people come back to exactly where they were. */
function SignInWithQuery({ path }: { path: string }) {
  const search = useSearchParams().toString();
  return <SignInLink next={search ? `${path}?${search}` : path} />;
}

function CreateItem({ canPublish }: { canPublish: boolean }) {
  const [open, setOpen] = useState(false);
  const desktop = useDesktop();
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(({ returnFocus = true }: { returnFocus?: boolean } = {}) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  return (
    <div ref={wrap} className="relative h-full">
      <button ref={button} type="button" aria-label="Criar" aria-haspopup={desktop ? undefined : 'dialog'} aria-expanded={open}
        aria-controls={open ? panelId : undefined} onClick={() => setOpen((v) => !v)}
        className={`${ITEM} text-muted hover:text-fg md:min-h-10 md:rounded-full md:border md:border-line-strong md:pl-3 md:pr-4 md:font-semibold md:text-fg md:hover:bg-surface-2 aria-expanded:text-fg md:aria-expanded:bg-surface-2`}>
        <PlusIcon className="size-6 md:size-5" active={open} />
        <Label>Criar</Label>
      </button>
      {open && <CreateSheet id={panelId} modal={!desktop} canPublish={canPublish} onClose={close} />}
    </div>
  );
}

/** Main navigation. Members: Início, Explorar, Criar, Avisos, Perfil. Visitors: Início, Explorar, Entrar. */
export function NavBar({ user, unread: serverUnread }: { user: NavUser | null; unread: number }) {
  const path = usePathname() ?? '/';
  // The bar lives in the layout, which is not re-rendered when moving between pages: after /avisos marks
  // everything read, the count it got from the server is stale. Hide that count until the server sends another.
  const [clearedAt, setClearedAt] = useState<number | null>(null);
  useEffect(() => {
    if (path === '/avisos') setClearedAt(serverUnread);
    else if (clearedAt !== null && clearedAt !== serverUnread) setClearedAt(null);
  }, [path, serverUnread, clearedAt]);
  const unread = clearedAt === serverUnread ? 0 : serverUnread;
  const home = isHome(path);
  const explore = isActive(path, '/explorar');

  if (!user) {
    return (
      <nav aria-label="Navegação principal" className={BAR}>
        <ul className={LIST}>
          <li className="flex-1 md:flex-none"><TabLink href="/" label="Início" active={home} icon={<HomeIcon active={home} className="size-6 md:hidden" />} /></li>
          <li className="flex-1 md:flex-none"><TabLink href="/explorar" label="Explorar" active={explore} icon={<ExploreIcon active={explore} className="size-6 md:hidden" />} /></li>
          <li className="flex-1 md:ml-auto md:flex-none">
            <Suspense fallback={<SignInLink next={path} />}><SignInWithQuery path={path} /></Suspense>
          </li>
        </ul>
      </nav>
    );
  }

  const profileHref = user.username ? `/@${user.username}` : '/bem-vindo';
  const profile = user.username
    ? [`/@${user.username}`, `/perfil/${user.username}`, '/minha-lista', '/minha-conta'].some((h) => isActive(path, h))
    : ['/bem-vindo', '/minha-conta'].some((h) => isActive(path, h));
  const alerts = isActive(path, '/avisos');
  const canPublish = Boolean(user.username) && !user.banned;

  return (
    <nav aria-label="Navegação principal" className={BAR}>
      <ul className={LIST}>
        <li className="flex-1 md:flex-none"><TabLink href="/" label="Início" active={home} icon={<HomeIcon active={home} className="size-6 md:hidden" />} /></li>
        <li className="flex-1 md:flex-none"><TabLink href="/explorar" label="Explorar" active={explore} icon={<ExploreIcon active={explore} className="size-6 md:hidden" />} /></li>
        <li className="flex-1 md:ml-auto md:mr-1 md:flex-none"><CreateItem canPublish={canPublish} /></li>
        <li className="flex-1 md:flex-none">
          <TabLink href="/avisos" label="Avisos" ariaLabel={unreadLabel(unread)} active={alerts} desktopLabel={false}
            icon={
              <span className="relative">
                <BellIcon active={alerts} className="size-6" />
                {unread > 0 && (
                  <span aria-hidden="true"
                    className="absolute -right-2 -top-1 min-w-[1.125rem] rounded-full bg-film px-1 text-center text-[0.65rem] font-bold leading-[1.125rem] text-bg ring-2 ring-bg">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
            } />
        </li>
        <li className="flex-1 md:flex-none">
          <div className="md:hidden">
            <TabLink href={profileHref} label="Perfil" active={profile}
              icon={user.avatarUrl
                ? <span className={`rounded-full ${profile ? 'ring-2 ring-fg' : ''}`}><Avatar url={user.avatarUrl} name={user.username ?? ''} size="xs" /></span>
                : <UserIcon active={profile} className="size-6" />} />
          </div>
          <div className="hidden md:block">
            <ProfileMenu username={user.username} avatarUrl={user.avatarUrl} isAdmin={user.isAdmin} />
          </div>
        </li>
      </ul>
    </nav>
  );
}
