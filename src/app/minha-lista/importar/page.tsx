import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { importCounts } from '@/lib/import/actions';
import type { ImportRow } from '@/lib/import/types';
import { createSessionClient } from '@/lib/supabase/session';
import { ImportProgress } from './ImportProgress';
import { ImportUploader } from './ImportUploader';

export const metadata: Metadata = { title: 'Importar · Minha lista · Lobby' };
// Each batch can take several catalog lookups; Vercel Hobby allows up to 60s.
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const card = 'space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800';

async function NotFoundList({ importId }: { importId: string }) {
  const supabase = await createSessionClient();
  const { data } = await supabase.from('import_items').select('id, row').eq('import_id', importId).eq('state', 'nao_encontrado').order('position').limit(500);
  const rows = (data ?? []) as Array<{ id: string; row: ImportRow }>;
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Não encontramos estes itens</h2>
      <p className="text-sm text-neutral-500">Busque cada um e adicione à sua lista manualmente.</p>
      <ul className="space-y-1">
        {rows.map(({ id, row }) => (
          <li key={id}>
            <Link href={`/busca?q=${encodeURIComponent(row.title)}`} className="underline">{row.title}</Link>
            <span className="text-neutral-500"> {[row.year, row.author].filter(Boolean).join(' · ')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Fminha-lista%2Fimportar');
  if (!user.username) redirect('/bem-vindo?next=%2Fminha-lista%2Fimportar');
  const { id } = await searchParams;

  if (id) {
    if (!UUID.test(id)) notFound();
    const counts = await importCounts(id);
    if (counts.total === 0) notFound();
    return (
      <section className="space-y-6">
        <p className="text-sm"><Link href="/minha-lista" className="underline">← Minha lista</Link></p>
        <h1 className="text-2xl font-bold">Importação</h1>
        <ImportProgress importId={id} initial={counts} />
        {counts.pending === 0 && <NotFoundList importId={id} />}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <p className="text-sm"><Link href="/minha-lista" className="underline">← Minha lista</Link></p>
      <h1 className="text-2xl font-bold">Importar sua lista</h1>
      <p className="text-neutral-500">Suas notas e resenhas chegam como privadas. Nada é publicado na comunidade sem você escolher.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h2 className="text-lg font-semibold">Letterboxd</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>No Letterboxd, vá em <strong>Settings → Import &amp; Export → Export Your Data</strong>.</li>
            <li>Abra o arquivo .zip que você baixou.</li>
            <li>Envie aqui os arquivos <code>watched.csv</code>, <code>ratings.csv</code>, <code>reviews.csv</code> e <code>watchlist.csv</code> (pode selecionar todos de uma vez).</li>
          </ol>
          <ImportUploader source="letterboxd" multiple />
        </div>
        <div className={card}>
          <h2 className="text-lg font-semibold">Goodreads</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>No Goodreads, vá em <strong>My Books → Import and export</strong>.</li>
            <li>Clique em <strong>Export Library</strong> e baixe o arquivo.</li>
            <li>Envie aqui o arquivo <code>goodreads_library_export.csv</code>.</li>
          </ol>
          <ImportUploader source="goodreads" multiple={false} />
        </div>
      </div>
    </section>
  );
}
