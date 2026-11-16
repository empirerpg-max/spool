import Link from 'next/link';
import type { PersonWithFollow } from '@/lib/social/queries';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';

/** People in "Seguidores" / "Seguindo": photo, name, @ and a follow button. */
export function PeopleList({ people, path, empty }: { people: PersonWithFollow[]; path: string; empty: string }) {
  if (people.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-3 py-3">
          <Avatar url={p.avatarUrl} name={p.displayName ?? p.username} />
          <Link href={`/@${p.username}`} className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{p.displayName ?? `@${p.username}`}</span>
            {p.displayName && <span className="block truncate text-sm text-muted">@{p.username}</span>}
          </Link>
          {!p.isMe && <FollowButton targetId={p.id} path={path} initialFollowing={p.isFollowing} size="sm" />}
        </li>
      ))}
    </ul>
  );
}
