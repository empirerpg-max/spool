import Link from 'next/link';
import type { CurrentUser } from '@/lib/auth/current-user';

/** Header menu. On phones only "Minha lista" and "Sair" stay visible so the header never overflows. */
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
      <Link href="/minha-lista">Minha lista</Link>
      {user.isAdmin && <Link href="/admin" className="hidden sm:inline">Admin</Link>}
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
