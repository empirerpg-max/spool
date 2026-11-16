import type { Metadata } from 'next';
import { AvailabilityList } from '@/components/work/AvailabilityList';
import { Trailer } from '@/components/work/Trailer';
import { WorkHero } from '@/components/work/WorkHero';
import { SectionNav } from '@/components/work/SectionNav';
import { CommunitySection } from '@/components/community/CommunitySection';
import { ListControls } from '@/components/list/ListControls';
import { getListItem } from '@/lib/list/queries';
import { cinemaStatus } from '@/lib/catalog/cinema';
import { getCurrentUser } from '@/lib/auth/current-user';
import { countTopics, listTopics } from '@/lib/community/queries';
import { WorkPosts } from '@/components/social/WorkPosts';
import { listPostsByWork } from '@/lib/social/post-queries';
import { loadWork as load } from './load';

type Params = Promise<{ kind: string; externalId: string }>;

async function listItem(workId: string | null, signedIn: boolean) {
  if (!workId || !signedIn) return null;
  try {
    return await getListItem(workId);
  } catch (e) {
    console.error('[list] get failed', e);
    return null;
  }
}

async function topicTotal(workId: string | null) {
  if (!workId) return 0;
  try {
    return await countTopics(workId);
  } catch (e) {
    console.error('[community] count failed', e);
    return 0;
  }
}

async function community(workId: string | null, page: number) {
  if (!workId) return null;
  try {
    return await listTopics(workId, page);
  } catch (e) {
    console.error('[community] list failed', e);
    return null;
  }
}

async function workPosts(workId: string | null, signedIn: boolean, page: number) {
  if (!workId || !signedIn) return null;
  try {
    return await listPostsByWork(workId, page);
  } catch (e) {
    console.error('[social] work posts failed', e);
    return null;
  }
}

const todaySaoPaulo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const brDate = (iso: string) => iso.split('-').reverse().join('/');

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { kind, externalId } = await params;
  const r = await load(kind, externalId);
  return { title: r ? `${r.work.title} · Lobby` : 'Lobby' };
}

export default async function WorkPage({ params, searchParams }: { params: Params; searchParams: Promise<{ pagina?: string; publicacoes?: string }> }) {
  const { kind, externalId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const postsPage = Math.max(1, Number(sp.publicacoes) || 1);
  const result = await load(kind, externalId);
  if (!result) {
    return <p role="status" className="py-16 text-center text-warn">Não foi possível carregar esta obra agora. Tente de novo em instantes.</p>;
  }
  const { work, stale } = result;
  const [topics, topicCount, user] = await Promise.all([community(result.id, page), topicTotal(result.id), getCurrentUser()]);
  const [item, posts] = await Promise.all([listItem(result.id, Boolean(user)), workPosts(result.id, Boolean(user), postsPage)]);
  const cinema = work.kind === 'movie' ? cinemaStatus(work, todaySaoPaulo()) : null;
  const sectionTitle = 'font-display text-2xl font-bold';

  const badge = cinema === 'em_cartaz'
    ? <span className="rounded-full bg-film/20 px-2.5 py-0.5 text-xs font-bold text-film">Nos cinemas</span>
    : cinema === 'em_breve' && work.theatricalDateBR
      ? <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">Em breve nos cinemas · {brDate(work.theatricalDateBR)}</span>
      : null;

  return (
    <article className="space-y-6">
      <WorkHero work={work} topicCount={topics ? topicCount : null} badge={badge}>
        <ListControls
          kind={work.kind}
          workId={result.id}
          workPath={result.path}
          item={item}
          signedIn={Boolean(user)}
          hasUsername={Boolean(user?.username)}
        />
      </WorkHero>

      <SectionNav items={[{ id: 'comunidade', label: 'Comunidade' }, ...(result.id ? [{ id: 'publicacoes', label: 'Publicações' }] : []), { id: 'sobre', label: 'Sobre' }, { id: 'onde-assistir', label: work.kind === 'book' ? 'Onde comprar' : 'Onde assistir' }]} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          <section id="comunidade" className="scroll-mt-32">
            <CommunitySection
              workId={topics ? result.id : null}
              workPath={result.path}
              topics={topics?.topics ?? []}
              hasMore={topics?.hasMore ?? false}
              page={page}
              signedIn={Boolean(user)}
            />
          </section>

          {result.id && (
            <WorkPosts workId={result.id} workPath={result.path} signedIn={Boolean(user)}
              posts={posts?.posts ?? []} hasMore={posts?.hasMore ?? false} page={postsPage} />
          )}

          <section id="sobre" className="scroll-mt-32 space-y-4">
            <h2 className={sectionTitle}>Sobre</h2>
            {work.overview ? (
              <div className="max-w-prose space-y-1">
                {work.overviewLang === 'en' && <p className="text-xs font-semibold uppercase tracking-wider text-muted">Sinopse em inglês</p>}
                <p className="leading-relaxed">{work.overview}</p>
              </div>
            ) : (
              <p className="text-muted">Sinopse indisponível</p>
            )}
            {work.people.length > 0 && (
              <p><span className="font-semibold">{work.kind === 'book' ? 'Autoria' : 'Elenco'}:</span> <span className="text-muted">{work.people.join(', ')}</span></p>
            )}
            {work.seasons.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold">Temporadas</h3>
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                  {work.seasons.map((s) => (
                    <li key={s.number} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                      <span className="font-semibold">Temporada {s.number}</span>
                      <span className="text-muted">{s.episodeCount} episódios{s.airDate && ` · ${brDate(s.airDate)}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stale && <p className="text-xs text-muted">Dados podem estar desatualizados</p>}
          </section>
        </div>

        <aside className="min-w-0 space-y-8">
          <section id="onde-assistir" className="scroll-mt-32">
            <AvailabilityList kind={work.kind} items={work.availability} />
          </section>
          <Trailer youtubeKey={work.trailerYoutubeKey} title={work.title} />
        </aside>
      </div>
    </article>
  );
}
