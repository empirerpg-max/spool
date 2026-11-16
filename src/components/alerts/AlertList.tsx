import Link from 'next/link';
import { relativeTime } from '@/lib/format';

export type AlertItem = { id: number | string; title: string; url: string; createdAt: string; unread: boolean };

export function AlertList({ alerts }: { alerts: AlertItem[] }) {
  if (alerts.length === 0) {
    return <p className="text-muted">Nenhum aviso por enquanto. Adicione obras à sua lista para ser avisado quando estrearem ou chegarem num streaming.</p>;
  }
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {alerts.map((a) => (
        <li key={a.id}>
          <Link href={a.url} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <span className={`size-2 shrink-0 rounded-full ${a.unread ? 'bg-film' : 'bg-transparent'}`} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block break-words font-semibold">{a.title}</span>
              <span className="text-sm text-muted">{relativeTime(a.createdAt)}</span>
            </span>
            {a.unread && <span className="rounded bg-film/20 px-1.5 text-xs font-bold text-film">Novo</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
