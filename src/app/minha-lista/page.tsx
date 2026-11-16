import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ListCard } from '@/components/list/ListCard';
import { getCurrentUser } from '@/lib/auth/current-user';
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
  `rounded-full border px-3 py-1 text-sm ${active ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:text-fg'}`;

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
        <h1 className="font-display text-3xl font-extrabold">Minha lista</h1>
        <Link href="/minha-lista/importar" className="text-sm underline">Importar do Letterboxd ou Goodreads</Link>
      </div>
      <nav aria-label="Tipo" className="flex flex-wrap gap-2">
        {KINDS.map(([k, label]) => <Link key={label} href={href(k, status)} aria-current={k === kind ? 'page' : undefined} className={chip(k === kind)}>{label}</Link>)}
      </nav>
      <nav aria-label="Estado" className="flex flex-wrap gap-2">
        {STATES.map(([s, label]) => <Link key={label} href={href(kind, s)} aria-current={s === status ? 'page' : undefined} className={chip(s === status)}>{label}</Link>)}
      </nav>
      {entries.length === 0 ? (
        <p className="text-muted">
          Sua lista está vazia. <Link href="/" className="underline">Busque um filme, série ou livro para começar.</Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {entries.map((e) => (
            <li key={e.workId}>
              <ListCard kind={e.work.kind} externalId={e.work.externalId} title={e.work.title} year={e.work.year}
                posterUrl={e.work.posterUrl} statusText={statusLabel(e.work.kind, e.status)} rating={e.rating} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
