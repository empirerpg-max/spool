import type { Metadata } from 'next';
import { ExploreCatalog } from '@/components/explore/ExploreCatalog';
import { ExploreSearch } from '@/components/explore/ExploreSearch';
import { KindTabs } from '@/components/explore/KindTabs';
import { WorkResults } from '@/components/explore/WorkResults';
import { getCurrentUser } from '@/lib/auth/current-user';
import { searchCatalog } from '@/lib/catalog/search';
import { loadCatalog } from '@/lib/explore/catalog';
import { kindFromTipo, parseKind, tipoFromKind, type ExploreKind } from '@/lib/explore/options';

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

  if (q) {
    // Search: the kind tabs filter the works; without ?tipo= every kind is shown.
    const kind: ExploreKind | null = kindFromTipo(tipo);
    const { hits, unavailable } = await searchCatalog(q);
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="sr-only">Explorar</h1>
        <ExploreSearch q={q} tipo={kind ? tipoFromKind(kind) : undefined} />
        <KindTabs withAll active={kind} hrefFor={(k) => href({ q, tipo: k ? tipoFromKind(k) : undefined })} />
        <WorkResults q={q} kind={kind} hits={hits} unavailable={unavailable} />
      </div>
    );
  }

  const kind = parseKind(tipo);
  const data = await loadCatalog(kind, user !== null);
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
