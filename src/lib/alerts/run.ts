import 'server-only';
import { fetchBook } from '@/lib/catalog/books-client';
import { supabaseWorkRepository } from '@/lib/catalog/repository';
import { fetchTmdbWork } from '@/lib/catalog/tmdb-client';
import { createServiceClient } from '@/lib/supabase/server';
import { runDailyBatch } from './job';
import { sendPendingPushes } from './push';

const todaySaoPaulo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const RETENTION_DAYS = 90;

/** Wires the daily batch to the real catalog, database and push service. */
export async function runDailyJob() {
  const db = createServiceClient();
  const repo = supabaseWorkRepository(db);
  const today = todaySaoPaulo();
  const must = <T,>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(`Supabase: ${r.error.message}`);
    return r.data;
  };

  return runDailyBatch({
    today,
    dueWorks: async (limit) =>
      (must(await db.rpc('due_works', { p_today: today, p_limit: limit })) as Array<{ id: string; kind: 'movie' | 'series' | 'book'; external_id: string }>)
        .map((r) => ({ id: r.id, kind: r.kind, externalId: r.external_id })),
    remainingCount: async () => must(await db.rpc('due_works_count', { p_today: today })) as number,
    findCached: async (kind, externalId) => (await repo.find(kind, externalId))?.work ?? null,
    fetchFresh: (kind, externalId) => (kind === 'book' ? fetchBook(externalId) : fetchTmdbWork(kind, externalId)),
    save: async (work) => { await repo.save(work); },
    recordEvent: async (workId, e) =>
      must(await db.rpc('record_event', { p_work: workId, p_kind: e.kind, p_key: e.key, p_title: e.title, p_body: e.body, p_url: e.url })) as number,
    markChecked: async (workId) => { must(await db.from('works').update({ checked_on: today, check_failures: 0 }).eq('id', workId)); },
    noteFailure: async (workId) => { must(await db.rpc('note_check_failure', { p_work: workId, p_today: today })); },
    sendPushes: () => sendPendingPushes(db),
    prune: async () => {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
      must(await db.from('notifications').delete().lt('created_at', cutoff));
    },
  });
}
