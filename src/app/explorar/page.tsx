import type { Metadata } from 'next';
import { ExploreCatalog } from '@/components/explore/ExploreCatalog';
import { ExploreSearch } from '@/components/explore/ExploreSearch';
import { KindTabs } from '@/components/explore/KindTabs';
import { PeopleResults } from '@/components/explore/PeopleResults';
import { ResultTabs } from '@/components/explore/ResultTabs';
import { WorkResults } from '@/components/explore/WorkResults';
import { getCurrentUser } from '@/lib/auth/current-user';
import { searchCatalog } from '@/lib/catalog/search';
import { loadCatalog, peopleToFollow } from '@/lib/explore/catalog';
import { kindFromTipo, parseKind, tipoFromKind, type ExploreKind } from '@/lib/explore/options';
import { searchPeople } from '@/lib/social/people-search';
import type { PersonWithFollow } from '@/lib/social/queries';

export const metadata: Metadata = { title: 'Explorar · Lobby' };

type Params = { q?: string | string[]; foco?: string | string[]; tipo?: string | string[]; aba?: string | string[] };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

function href(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
  const s = q.toString();
  return s ? `/explorar?${s}` : '/explorar';
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = first(params.q).trim();
  const tipo = first(params.tipo);
  const user = await getCurrentUser();

  if (first(params.aba) === 'pessoas') {
    // People: members only. Empty search shows people to follow; a failure shows an empty list, not an error page.
    const quiet = (what: string) => (e: unknown): PersonWithFollow[] => { console.error(`[explore] ${what} failed`, e); return []; };
    const [people, suggestions] = user
      ? await Promise.all([
        q ? searchPeople(q).catch(quiet('people search')) : [],
        q ? [] : peopleToFollow(8).catch(quiet('people to follow')),
      ])
      : [[], []];
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="sr-only">Explorar</h1>
        <ExploreSearch q={q} tab="pessoas" />
        <ResultTabs q={q} tab="pessoas" tipo={tipo || undefined} />
        <PeopleResults q={q} member={user !== null} people={people} suggestions={suggestions} />
      </div>
    );
  }

  if (q) {
    // Works: the kind tabs filter the results; without ?tipo= every kind is shown.
    const kind: ExploreKind | null = kindFromTipo(tipo);
    const { hits, unavailable } = await searchCatalog(q);
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="sr-only">Explorar</h1>
        <ExploreSearch q={q} tipo={kind ? tipoFromKind(kind) : undefined} />
        <ResultTabs q={q} tab="obras" tipo={kind ? tipoFromKind(kind) : undefined} />
        <KindTabs withAll active={kind} hrefFor={(k) => href({ q, tipo: k ? tipoFromKind(k) : undefined })} />
        <WorkResults q={q} kind={kind} hits={hits} unavailable={unavailable} />
      </div>
    );
  }

  const kind = parseKind(tipo);
  const data = loadCatalog(kind, user !== null);
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="sr-only">Explorar</h1>
      <div className="max-w-2xl space-y-4">
        <ExploreSearch q="" tipo={tipo ? tipoFromKind(kind) : undefined} autoFocus={first(params.foco) === 'busca'} />
        <KindTabs active={kind} hrefFor={(k) => href({ tipo: k && k !== 'movie' ? tipoFromKind(k) : undefined })} />
      </div>
      <ExploreCatalog data={data} />
    </div>
  );
}
