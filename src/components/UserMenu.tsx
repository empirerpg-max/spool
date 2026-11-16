import Link from 'next/link';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/current-user';

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    const path = (await headers()).get('x-lobby-path') ?? '/';
    return <Link href={`/entrar?next=${encodeURIComponent(path)}`} className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg">Entrar</Link>;
  }
  return (
    <div className="flex items-center gap-4 text-sm font-medium">
      <Link href="/minha-lista">Minha lista</Link>
      {user.isAdmin && <Link href="/admin">Admin</Link>}
      {user.username ? <span>@{user.username}</span> : <Link href="/bem-vindo">Escolher nome</Link>}
      <form action="/sair" method="post">
        <button type="submit" className="text-muted hover:underline">Sair</button>
      </form>
    </div>
  );
}
