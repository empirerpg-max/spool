import type { AlertItem } from '@/components/alerts/AlertList';

export type ActivityKind = 'follow' | 'like' | 'reply' | 'watched_reply';

/** One social alert as read from the database, already joined with names and titles. */
export type ActivityRow = {
  id: number;
  kind: ActivityKind;
  /** @ of who did it */
  actor: string | null;
  post: { id: string; workTitle: string } | null;
  topic: { id: string; title: string; href: string } | null;
  createdAt: string;
  unread: boolean;
};

const others = (n: number) => `e mais ${n}`;
const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

/**
 * Groups repeated social alerts so the bell reads "@ana e mais 3 curtiram sua publicação sobre Matrix".
 * Rows are grouped by kind and target (all follows together), keeping unread apart from already read.
 * The person named is the most recent one. Groups come newest first.
 */
export function groupActivity(rows: ActivityRow[], myUsername: string | null): AlertItem[] {
  const groups = new Map<string, ActivityRow[]>();
  for (const r of rows) {
    const target = r.kind === 'follow' ? '' : r.kind === 'watched_reply' && r.topic ? `t:${r.topic.id}` : r.post ? `p:${r.post.id}` : null;
    if (target === null) continue; // the post or topic is gone
    const key = `${r.kind}|${target}|${r.unread ? 'new' : 'old'}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const items: AlertItem[] = [];
  for (const [key, list] of groups) {
    const sorted = [...list].sort(newestFirst);
    const first = sorted[0];
    const actors = [...new Set(sorted.map((r) => r.actor ?? 'alguém'))];
    const who = `@${actors[0]}`;
    const more = actors.length - 1;
    const about = first.post ? `sua publicação sobre ${first.post.workTitle}` : '';
    let title: string;
    let url: string;
    switch (first.kind) {
      case 'follow':
        title = more === 0 ? `${who} começou a seguir você` : `${who} ${others(more)} começaram a seguir você`;
        url = more === 0 || !myUsername ? `/@${actors[0]}` : `/@${myUsername}/seguidores`;
        break;
      case 'like':
        title = more === 0 ? `${who} curtiu ${about}` : `${who} ${others(more)} curtiram ${about}`;
        url = `/p/${first.post!.id}`;
        break;
      case 'reply':
        title = more === 0 ? `${who} respondeu ${about}` : `${who} ${others(more)} responderam ${about}`;
        url = `/p/${first.post!.id}`;
        break;
      default: {
        const where = first.topic ? first.topic.title : `publicação sobre ${first.post!.workTitle}`;
        title = sorted.length === 1
          ? `Nova resposta em uma conversa que você acompanha: ${where}`
          : `${sorted.length} novas respostas em uma conversa que você acompanha: ${where}`;
        url = first.topic ? first.topic.href : `/p/${first.post!.id}`;
      }
    }
    items.push({ id: `social:${key}`, title, url, createdAt: first.createdAt, unread: first.unread });
  }
  return items.sort(newestFirst);
}

/** List alerts and social alerts in one list, newest first. */
export function mergeAlerts(list: AlertItem[], social: AlertItem[]): AlertItem[] {
  return [...list, ...social].sort(newestFirst);
}
