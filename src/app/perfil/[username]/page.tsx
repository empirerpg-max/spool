import type { Metadata } from 'next';
import Link from 'next/link';
import { ListCard } from '@/components/list/ListCard';
import { ProfileHeader } from '@/components/social/ProfileHeader';
import { ProfilePosts } from '@/components/social/ProfilePosts';
import { ProfileReviews } from '@/components/social/ProfileReviews';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listMyItems } from '@/lib/list/queries';
import { statusLabel } from '@/lib/list/types';
import { listProfileList, listProfileReviews, type ProfileView } from '@/lib/social/queries';
import { listPostsByAuthor } from '@/lib/social/post-queries';
import { handleOf, loadProfile } from './load';

type Params = { params: Promise<{ username: string }>; searchParams: Promise<{ aba?: string; pagina?: string }> };

const TABS = [['publicacoes', 'Publicações'], ['resenhas', 'Resenhas'], ['lista', 'Lista']] as const;
type Tab = (typeof TABS)[number][0];

const LIST_GRID = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${handleOf(username)} · Lobby` };
}

async function PostsTab({ profile, page }: { profile: ProfileView; page: number }) {
  const { posts, hasMore } = await listPostsByAuthor(profile.id, page);
  return <ProfilePosts posts={posts} isMe={profile.isMe} base={`/@${profile.username}`} page={page} hasMore={hasMore} />;
}

/** Your own "Lista" tab: the whole list with your stars, as in Minha lista (which keeps import and filters). */
async function OwnListTab({ profile }: { profile: ProfileView }) {
  const entries = await listMyItems();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted">
          {profile.listPublic ? 'Sua lista aparece para outros membros, sem estrelas nem resenhas.' : 'Só você vê sua lista aqui.'}{' '}
          <Link href="/minha-conta#perfil" className="underline">Mudar em Minha conta</Link>
        </p>
        <Link href="/minha-lista" className="text-sm font-semibold underline">Abrir lista completa</Link>
      </div>
      {entries.length === 0 ? (
        <p className="text-muted">
          Nenhuma obra na lista ainda. <Link href="/explorar" className="underline">Explore filmes, séries e livros para começar.</Link>
        </p>
      ) : (
        <ul className={LIST_GRID}>
          {entries.map((e) => (
            <li key={e.workId}>
              <ListCard kind={e.work.kind} externalId={e.work.externalId} title={e.work.title} year={e.work.year}
                posterUrl={e.work.posterUrl} statusText={statusLabel(e.work.kind, e.status)} rating={e.rating} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Someone else's public list: works and status only, never their stars or reviews. */
async function ListTab({ profile }: { profile: ProfileView }) {
  const entries = await listProfileList(profile.username, false);
  if (entries.length === 0) return <p className="text-muted">Nenhuma obra na lista ainda.</p>;
  return (
    <ul className={LIST_GRID}>
      {entries.map((e) => (
        <li key={e.workId}>
          <ListCard kind={e.work.kind} externalId={e.work.externalId} title={e.work.title} year={e.work.year}
            posterUrl={e.work.posterUrl} statusText={statusLabel(e.work.kind, e.status)} rating={null} />
        </li>
      ))}
    </ul>
  );
}

export default async function ProfilePage({ params, searchParams }: Params) {
  const [{ username }, sp] = await Promise.all([params, searchParams]);
  const profile = await loadProfile(username);
  if (profile.iBlocked) return <section className="space-y-6"><ProfileHeader profile={profile} /></section>;
  const isAdmin = profile.isMe && Boolean((await getCurrentUser())?.isAdmin);

  const showList = profile.listPublic || profile.isMe;
  const tabs = TABS.filter(([id]) => id !== 'lista' || showList);
  const tab: Tab = tabs.some(([id]) => id === sp.aba) ? (sp.aba as Tab) : 'publicacoes';
  const base = `/@${profile.username}`;

  return (
    <section className="space-y-6">
      <ProfileHeader profile={profile} isAdmin={isAdmin} />
      <nav aria-label="Abas do perfil" className="flex gap-1 border-b border-line">
        {tabs.map(([id, label]) => (
          <Link key={id} href={id === 'publicacoes' ? base : `${base}?aba=${id}`} aria-current={id === tab ? 'page' : undefined}
            className={`-mb-px flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold ${id === tab ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'publicacoes' && <PostsTab profile={profile} page={Math.max(1, Number(sp.pagina) || 1)} />}
      {tab === 'resenhas' && <ProfileReviews reviews={await listProfileReviews(profile.id)} />}
      {tab === 'lista' && (profile.isMe ? <OwnListTab profile={profile} /> : <ListTab profile={profile} />)}
    </section>
  );
}
