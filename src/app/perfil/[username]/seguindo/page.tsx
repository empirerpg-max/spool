import type { Metadata } from 'next';
import { handleOf } from '../load';
import { PeoplePage } from '../people-page';

type Params = { params: Promise<{ username: string }>; searchParams: Promise<{ pagina?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: `Seguindo · @${handleOf(username)} · Lobby` };
}

export default async function FollowingPage({ params, searchParams }: Params) {
  const [{ username }, sp] = await Promise.all([params, searchParams]);
  return <PeoplePage username={username} side="seguindo" pagina={sp.pagina} />;
}
