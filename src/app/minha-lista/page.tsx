import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Stars } from '@/components/list/StarRating';
import { getCurrentUser } from '@/lib/auth/current-user';
import { workPath } from '@/lib/catalog/kind';
import type { WorkKind } from '@/lib/catalog/types';
import { listMyItems } from '@/lib/list/queries';
import { LIST_STATUSES, statusLabel, type ListStatus } from '@/lib/list/types';

export const metadata: Metadata = { title: 'Minha lista · Lobby' };

const KINDS: Array<[WorkKind | undefined, string]> = [[undefined, 'Tudo'], ['movie', 'Filmes'], ['series', 'Séries'], ['book', 'Livros']];
const STATES: Array<[ListStatus | undefined, string]> = [[undefined, 'Todos'], ['quero', 'Quero'], ['andamento', 'Em andamento'], ['concluido', 'Concluídos']];
const KIND_PARAM: Record<string, WorkKind> = { filmes: 'movie', series: 'series', livros: 'book' };
const KIND_SLUG: Record<WorkKind, string> = { movie: 'filmes', series: 'series', book: 'livros' };

function href(kind: WorkKind | undefined, status: ListStatus | undefined) {
  const q = new URLSearchParams();
  if (kind) q.set('tipo', KIND_SLUG[kind]);
  if (status) q.set('estado', status);
  const s = q.toString();
  return s ? `/minha-lista?${s}` : '/minha-lista';
}

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${active ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900' : 'border-neutral-300 dark:border-neutral-700'}`;

export default async function MyListPage({ searchParams }: { searchParams: Promise<{ tipo?: string; estado?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Fminha-lista');
  const sp = await searchParams;
  const kind = sp.tipo ? KIND_PARAM[sp.tipo] : undefined;
  const status = LIST_STATUSES.includes(sp.estado as ListStatus) ? (sp.estado as ListStatus) : undefined;
  const entries = await listMyItems({ kind, status });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Minha lista</h1>
        <Link href="/minha-lista/importar" className="text-sm underline">Importar do Letterboxd ou Goodreads</Link>
      </div>
      <nav aria-label="Tipo" className="flex flex-wrap gap-2">
        {KINDS.map(([k, label]) => <Link key={label} href={href(k, status)} aria-current={k === kind ? 'page' : undefined} className={chip(k === kind)}>{label}</Link>)}
      </nav>
      <nav aria-label="Estado" className="flex flex-wrap gap-2">
        {STATES.map(([s, label]) => <Link key={label} href={href(kind, s)} aria-current={s === status ? 'page' : undefined} className={chip(s === status)}>{label}</Link>)}
      </nav>
      {entries.length === 0 ? (
        <p className="text-neutral-500">
          Sua lista está vazia. <Link href="/" className="underline">Busque um filme, série ou livro para começar.</Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {entries.map((e) => (
            <li key={e.workId}>
              <Link href={workPath(e.work.kind, e.work.externalId)} className="block space-y-1">
                {e.work.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.work.posterUrl} alt="" className="aspect-[2/3] w-full rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-neutral-200 text-sm text-neutral-500 dark:bg-neutral-800">Sem capa</div>
                )}
                <p className="font-medium leading-tight">{e.work.title}{e.work.year && <span className="font-normal text-neutral-500"> ({e.work.year})</span>}</p>
                <p className="text-sm text-neutral-500">{statusLabel(e.work.kind, e.status)}{e.rating !== null && <> · <Stars value={e.rating} /></>}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
