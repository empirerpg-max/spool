import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveReport } from '@/lib/admin/actions';
import { AdminNav } from '@/components/admin/AdminNav';
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
  social_post: One<{ id: string; caption: string; author: One<{ username: string | null }> }>;
  social_reply: One<{ body: string; post_id: string; author: One<{ username: string | null }> }>;
};

const TOPIC = 'id, title, body, work:works(kind, external_id), author:profiles!topics_author_id_fkey(username)';

const SOCIAL = 'social_post:social_posts(id, caption, author:profiles!social_posts_author_id_fkey(username)), '
  + 'social_reply:social_replies(body, post_id, author:profiles!social_replies_author_id_fkey(username))';

/** What was reported, who wrote it, a short excerpt and where to see it. */
function target(r: ReportRow): { label: string; author: string; text: string; href: string | null; linkText: string } {
  const sp = one(r.social_post);
  if (sp) return { label: 'publicação', author: one(sp.author)?.username ?? '?', text: sp.caption, href: `/p/${sp.id}`, linkText: 'Ver a publicação' };
  const sr = one(r.social_reply);
  if (sr) return { label: 'resposta a publicação', author: one(sr.author)?.username ?? '?', text: sr.body, href: `/p/${sr.post_id}`, linkText: 'Ver a publicação' };
  const post = one(r.post);
  const topic = one(r.topic) ?? one(post?.topic ?? null);
  const work = one(topic?.work ?? null);
  return {
    label: post ? 'resposta' : 'tópico',
    author: one(post ? post.author : topic?.author ?? null)?.username ?? '?',
    text: post?.body ?? `${topic?.title ?? ''}\n\n${topic?.body ?? ''}`,
    href: topic && work ? `${workPath(work.kind, work.external_id)}/topicos/${topic.id}` : null,
    linkText: 'Ver no tópico',
  };
}

function Button({ reportId, action, children, danger }: { reportId: string; action: string; children: string; danger?: boolean }) {
  return (
    <form action={resolveReport}>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={`rounded px-3 py-1 text-sm ${danger ? 'bg-danger font-semibold text-bg' : 'border border-line'}`}>{children}</button>
    </form>
  );
}

export default async function AdminReportsPage() {
  await requireAdmin('/admin');
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from('reports')
    .select(`id, reason, note, created_at, reporter:profiles!reports_reporter_id_fkey(username), topic:topics(${TOPIC}), post:posts(body, author:profiles!posts_author_id_fkey(username), topic:topics(${TOPIC})), ${SOCIAL}`)
    .is('resolved_at', null)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const reports = (data ?? []) as unknown as ReportRow[];

  return (
    <section className="space-y-6">
      <AdminNav current="/admin" />
      <h1 className="text-2xl font-bold">Denúncias abertas</h1>
      {reports.length === 0 && <p className="text-muted">Nenhuma denúncia aberta</p>}
      <ul className="space-y-4">
        {reports.map((r) => {
          const t = target(r);
          const author = t.author;
          const text = t.text.slice(0, 300);
          return (
            <li key={r.id} className="space-y-2 rounded-lg border border-line p-4">
              <p className="text-sm">
                <strong>{REASONS[r.reason] ?? r.reason}</strong> · por @{one(r.reporter)?.username ?? '?'} · {relativeTime(r.created_at)} · {t.label} de @{author}
              </p>
              {r.note && <p className="text-sm italic">“{r.note}”</p>}
              <blockquote className="whitespace-pre-wrap border-l-2 border-line pl-3 text-sm">{text}</blockquote>
              {t.href && <Link href={t.href} className="text-sm underline">{t.linkText}</Link>}
              <div className="flex flex-wrap items-center gap-2">
                <Button reportId={r.id} action="remover">Remover</Button>
                <Button reportId={r.id} action="ignorar">Ignorar</Button>
                <details>
                  <summary className="cursor-pointer text-sm text-danger">Remover e banir autor</summary>
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
