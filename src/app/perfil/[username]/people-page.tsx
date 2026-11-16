import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PeopleList } from '@/components/social/PeopleList';
import { listFollowers, listFollowing } from '@/lib/social/queries';
import { loadProfile } from './load';

/** Shared body of /@x/seguidores and /@x/seguindo. */
export async function PeoplePage({ username, side, pagina }: { username: string; side: 'seguidores' | 'seguindo'; pagina?: string }) {
  const profile = await loadProfile(username, `/${side}`);
  const base = `/@${profile.username}`;
  if (profile.iBlocked) redirect(base);
  const page = Math.max(1, Number(pagina) || 1);
  const { people, hasMore } = await (side === 'seguidores' ? listFollowers : listFollowing)(profile.id, page);
  const name = profile.displayName ?? `@${profile.username}`;
  const empty = side === 'seguidores'
    ? (profile.isMe ? 'Ninguém segue você ainda.' : `Ninguém segue ${name} ainda.`)
    : (profile.isMe ? 'Você ainda não segue ninguém.' : `${name} ainda não segue ninguém.`);

  return (
    <section className="max-w-xl space-y-4">
      <Link href={base} className="text-sm text-muted hover:underline">← {name}</Link>
      <h1 className="font-display text-2xl font-extrabold">{side === 'seguidores' ? 'Seguidores' : 'Seguindo'}</h1>
      <nav aria-label="Seguidores e seguindo" className="flex gap-4 text-sm">
        <Link href={`${base}/seguidores`} aria-current={side === 'seguidores' ? 'page' : undefined} className={side === 'seguidores' ? 'font-semibold' : 'text-muted hover:text-fg'}>Seguidores</Link>
        <Link href={`${base}/seguindo`} aria-current={side === 'seguindo' ? 'page' : undefined} className={side === 'seguindo' ? 'font-semibold' : 'text-muted hover:text-fg'}>Seguindo</Link>
      </nav>
      <PeopleList people={people} path={`/perfil/${profile.username}/${side}`} empty={empty} />
      <div className="flex gap-4 text-sm">
        {page > 1 && <Link href={`${base}/${side}?pagina=${page - 1}`} className="underline">Anteriores</Link>}
        {hasMore && <Link href={`${base}/${side}?pagina=${page + 1}`} className="underline">Mais pessoas</Link>}
      </div>
    </section>
  );
}
