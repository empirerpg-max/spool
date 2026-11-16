import Link from 'next/link';
import type { CurrentUser } from '@/lib/auth/current-user';

/**
 * Header menu. On phones only the timeline icon, "Minha lista" and "Sair" stay visible so the header never overflows.
 */
export function UserMenuView({ user, path }: { user: CurrentUser | null; path: string }) {
  if (!user) {
    return (
      <Link href={`/entrar?next=${encodeURIComponent(path)}`} className="whitespace-nowrap rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg">
        Entrar
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-4 whitespace-nowrap text-sm font-medium">
      <Link href="/timeline" aria-label="Timeline" className="text-muted hover:text-fg sm:text-fg">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
        <span aria-hidden="true" className="hidden sm:inline">Timeline</span>
      </Link>
      {user.username && !user.banned && <Link href="/publicar" className="hidden md:inline">Publicar</Link>}
      <Link href="/minha-lista">Minha lista</Link>
      {user.isAdmin && <Link href="/admin" className="hidden sm:inline">Admin</Link>}
      {user.username && <Link href={`/@${user.username}`} className="hidden sm:inline">Meu perfil</Link>}
      {user.username ? (
        <Link href="/minha-conta" className="hidden max-w-[12rem] truncate sm:inline">@{user.username}</Link>
      ) : (
        <Link href="/bem-vindo" className="hidden sm:inline">Escolher nome</Link>
      )}
      <form action="/sair" method="post">
        <button type="submit" className="text-muted hover:underline">Sair</button>
      </form>
    </div>
  );
}
