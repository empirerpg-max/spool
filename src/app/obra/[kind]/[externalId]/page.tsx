import type { Metadata } from 'next';
import { AvailabilityList } from '@/components/work/AvailabilityList';
import { Trailer } from '@/components/work/Trailer';
import { CommunitySection } from '@/components/community/CommunitySection';
import { ListControls } from '@/components/list/ListControls';
import { getListItem } from '@/lib/list/queries';
import { cinemaStatus } from '@/lib/catalog/cinema';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listTopics } from '@/lib/community/queries';
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

async function community(workId: string | null, page: number) {
  if (!workId) return null;
  try {
    return await listTopics(workId, page);
  } catch (e) {
    console.error('[community] list failed', e);
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

export default async function WorkPage({ params, searchParams }: { params: Params; searchParams: Promise<{ pagina?: string }> }) {
  const { kind, externalId } = await params;
  const page = Math.max(1, Number((await searchParams).pagina) || 1);
  const result = await load(kind, externalId);
  if (!result) {
    return <p role="status" className="py-16 text-center text-amber-600">Não foi possível carregar esta obra agora. Tente de novo em instantes.</p>;
  }
  const { work, stale } = result;
  const [topics, user] = await Promise.all([community(result.id, page), getCurrentUser()]);
  const item = await listItem(result.id, Boolean(user));
  const cinema = work.kind === 'movie' ? cinemaStatus(work, todaySaoPaulo()) : null;
  const year = work.releaseDateBR?.slice(0, 4);

  return (
    <article className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        {work.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={work.posterUrl} alt={`Capa de ${work.title}`} width={200} height={300} className="w-40 self-start rounded-lg sm:w-52" />
        ) : (
          <div className="flex h-60 w-40 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800">Sem capa</div>
        )}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">
            {work.title} {year && <span className="font-normal text-neutral-500">({year})</span>}
          </h1>
          {work.originalTitle && <p className="text-neutral-500">{work.originalTitle}</p>}
          {cinema === 'em_cartaz' && <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-sm font-medium text-black">Nos cinemas</span>}
          {cinema === 'em_breve' && work.theatricalDateBR && (
            <span className="inline-block rounded-full bg-neutral-200 px-3 py-1 text-sm dark:bg-neutral-800">Em breve nos cinemas · {brDate(work.theatricalDateBR)}</span>
          )}
          {work.overview ? (
            <div className="space-y-1">
              {work.overviewLang === 'en' && <p className="text-xs uppercase text-neutral-500">Sinopse em inglês</p>}
              <p>{work.overview}</p>
            </div>
          ) : (
            <p className="text-neutral-500">Sinopse indisponível</p>
          )}
          {work.people.length > 0 && (
            <p><span className="font-medium">{work.kind === 'book' ? 'Autoria' : 'Elenco'}:</span> {work.people.join(', ')}</p>
          )}
          {stale && <p className="text-xs text-neutral-500">Dados podem estar desatualizados</p>}
        </div>
      </div>

      <ListControls
        kind={work.kind}
        workId={result.id}
        workPath={result.path}
        item={item}
        signedIn={Boolean(user)}
        hasUsername={Boolean(user?.username)}
      />

      <Trailer youtubeKey={work.trailerYoutubeKey} />

      {work.seasons.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Temporadas</h2>
          <ul className="space-y-1">
            {work.seasons.map((s) => (
              <li key={s.number}>
                Temporada {s.number} · {s.episodeCount} episódios{s.airDate && ` · estreia ${brDate(s.airDate)}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AvailabilityList kind={work.kind} items={work.availability} />

      <CommunitySection
        workId={topics ? result.id : null}
        workPath={result.path}
        topics={topics?.topics ?? []}
        hasMore={topics?.hasMore ?? false}
        page={page}
        signedIn={Boolean(user)}
      />
    </article>
  );
}
