import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { workPath } from '@/lib/catalog/kind';
import type { ActiveCommunity, SuggestedPerson } from '@/lib/social/types';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What a new member sees instead of an empty page: people to follow and busy communities. */
type Props = {
  people: SuggestedPerson[];
  communities: ActiveCommunity[];
  /** Page to refresh after following someone. */
  path?: string;
  /** Narrow version for the home's side column. */
  compact?: boolean;
};

export function TimelineEmpty({ people, communities, path = '/timeline', compact = false }: Props) {
  return (
    <div className={compact ? 'space-y-6' : 'space-y-10'}>
      <header className="space-y-2">
        <h2 className={`font-display font-bold ${compact ? 'text-lg' : 'text-2xl'}`}>Sua timeline está vazia por enquanto</h2>
        <p className="text-muted">
          Aqui aparecem as publicações e resenhas de quem você segue e as respostas nas conversas que você acompanha.
          Comece seguindo alguns membros ou entrando numa comunidade.
        </p>
      </header>

      {people.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold">Membros para seguir</h3>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface px-4">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <Avatar url={p.avatarUrl} name={p.displayName ?? p.username} />
                <Link href={`/@${p.username}`} className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.displayName ?? `@${p.username}`}</span>
                  <span className="block truncate text-sm text-muted">
                    {p.displayName ? `@${p.username} · ` : ''}{p.recentPosts > 0 ? `${count(p.recentPosts, 'participação', 'participações')} no último mês` : 'Membro do clube'}
                  </span>
                </Link>
                <FollowButton targetId={p.id} path={path} initialFollowing={false} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {communities.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold">Comunidades movimentadas da semana</h3>
          <ul className={compact ? 'grid gap-2' : 'grid gap-2 sm:grid-cols-2'}>
            {communities.map((c) => (
              <li key={`${c.work.kind}-${c.work.externalId}`}>
                <Link href={`${workPath(c.work.kind, c.work.externalId)}#comunidade`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2 hover:border-line-strong">
                  {c.work.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.work.posterUrl} alt="" width={40} height={60} loading="lazy" className="h-[60px] w-10 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="h-[60px] w-10 shrink-0 rounded bg-surface-2" />
                  )}
                  <span className="min-w-0 space-y-1">
                    <span className="block truncate font-semibold">{c.work.title}</span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <KindTag kind={c.work.kind} />
                      <span>{count(c.topics, 'tópico', 'tópicos')} · {count(c.posts, 'publicação', 'publicações')}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-muted">
        Procurando algo específico? <Link href="/explorar?foco=busca" className="underline">Buscar obras</Link>
      </p>
    </div>
  );
}
