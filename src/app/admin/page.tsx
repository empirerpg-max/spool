import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveReport } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { workPath } from '@/lib/catalog/kind';
import type { WorkKind } from '@/lib/catalog/types';
import { createSessionClient } from '@/lib/supabase/session';
import { relativeTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Denúncias · Admin · Lobby' };

const REASONS: Record<string, string> = { spoiler: 'Spoiler sem aviso', ofensa: 'Ofensa', spam: 'Spam', pirataria: 'Pirataria', outro: 'Outro' };

type One<T> = T | T[] | null;
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
type WorkRef = { kind: WorkKind; external_id: string };
type TopicRef = { id: string; title: string; body: string; work: One<WorkRef>; author: One<{ username: string | null }> };
type ReportRow = {
  id: string; reason: string; note: string | null; created_at: string;
  reporter: One<{ username: string | null }>;
  topic: One<TopicRef>;
  post: One<{ body: string; author: One<{ username: string | null }>; topic: One<TopicRef> }>;
};

const TOPIC = 'id, title, body, work:works(kind, external_id), author:profiles!topics_author_id_fkey(username)';

function Button({ reportId, action, children, danger }: { reportId: string; action: string; children: string; danger?: boolean }) {
  return (
    <form action={resolveReport}>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={`rounded px-3 py-1 text-sm ${danger ? 'bg-red-600 text-white' : 'border border-neutral-300 dark:border-neutral-700'}`}>{children}</button>
    </form>
  );
}

export default async function AdminReportsPage() {
  await requireAdmin('/admin');
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('reports')
    .select(`id, reason, note, created_at, reporter:profiles!reports_reporter_id_fkey(username), topic:topics(${TOPIC}), post:posts(body, author:profiles!posts_author_id_fkey(username), topic:topics(${TOPIC}))`)
    .is('resolved_at', null)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const reports = (data ?? []) as unknown as ReportRow[];

  return (
    <section className="space-y-6">
      <nav className="flex gap-4 text-sm"><span className="font-semibold">Denúncias</span><Link href="/admin/dominios" className="underline">Domínios bloqueados</Link></nav>
      <h1 className="text-2xl font-bold">Denúncias abertas</h1>
      {reports.length === 0 && <p className="text-neutral-500">Nenhuma denúncia aberta</p>}
      <ul className="space-y-4">
        {reports.map((r) => {
          const post = one(r.post);
          const topic = one(r.topic) ?? one(post?.topic ?? null);
          const work = one(topic?.work ?? null);
          const author = one(post ? post.author : topic?.author ?? null)?.username ?? '?';
          const text = (post?.body ?? `${topic?.title ?? ''}\n\n${topic?.body ?? ''}`).slice(0, 300);
          const href = topic && work ? `${workPath(work.kind, work.external_id)}/topicos/${topic.id}` : null;
          return (
            <li key={r.id} className="space-y-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-sm">
                <strong>{REASONS[r.reason] ?? r.reason}</strong> · por @{one(r.reporter)?.username ?? '?'} · {relativeTime(r.created_at)} · {post ? 'resposta' : 'tópico'} de @{author}
              </p>
              {r.note && <p className="text-sm italic">“{r.note}”</p>}
              <blockquote className="whitespace-pre-wrap border-l-2 border-neutral-300 pl-3 text-sm dark:border-neutral-700">{text}</blockquote>
              {href && <Link href={href} className="text-sm underline">Ver no tópico</Link>}
              <div className="flex flex-wrap items-center gap-2">
                <Button reportId={r.id} action="remover">Remover</Button>
                <Button reportId={r.id} action="ignorar">Ignorar</Button>
                <details>
                  <summary className="cursor-pointer text-sm text-red-600">Remover e banir autor</summary>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span>Banir @{author}?</span>
                    <Button reportId={r.id} action="banir" danger>Confirmar</Button>
                  </div>
                </details>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
