import Link from 'next/link';
import type { ProfileView } from '@/lib/social/queries';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import { ProfileMenu } from './ProfileMenu';
import { UnblockButton } from './UnblockButton';

const n = (v: number) => v.toLocaleString('pt-BR');
const plural = (v: number, one: string, many: string) => `${n(v)} ${v === 1 ? one : many}`;

/** Top of a profile page: photo, name, @, bio, counts and the buttons that fit who is looking. */
export function ProfileHeader({ profile: p }: { profile: ProfileView }) {
  const path = `/perfil/${p.username}`;
  const name = p.displayName ?? `@${p.username}`;

  if (p.iBlocked) {
    return (
      <header className="flex flex-wrap items-center gap-4">
        <Avatar url={null} name={p.displayName ?? p.username} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="break-words font-display text-2xl font-extrabold">{name}</h1>
          <p className="text-muted">Você bloqueou @{p.username}</p>
          <UnblockButton targetId={p.id} path={path} />
        </div>
      </header>
    );
  }

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar url={p.avatarUrl} name={p.displayName ?? p.username} size="lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="break-words font-display text-2xl font-extrabold">{name}</h1>
          {p.displayName && <p className="text-muted">@{p.username}</p>}
          {p.bio && <p className="whitespace-pre-line break-words">{p.bio}</p>}
        </div>
        <div className="flex items-start gap-2">
          {p.isMe ? (
            <Link href="/minha-conta#perfil" className="rounded-full border border-line-strong px-5 py-2 font-semibold hover:bg-surface-2">Editar perfil</Link>
          ) : (
            <>
              <FollowButton targetId={p.id} path={path} initialFollowing={p.isFollowing} />
              <ProfileMenu targetId={p.id} username={p.username} path={path} muted={p.iMuted} blocked={false} />
            </>
          )}
        </div>
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <Link href={`/@${p.username}/seguidores`} className="hover:text-fg hover:underline">{plural(p.followers, 'seguidor', 'seguidores')}</Link>
        <Link href={`/@${p.username}/seguindo`} className="hover:text-fg hover:underline">{`${n(p.following)} seguindo`}</Link>
        <span>{plural(p.posts, 'publicação', 'publicações')}</span>
      </p>
    </header>
  );
}
