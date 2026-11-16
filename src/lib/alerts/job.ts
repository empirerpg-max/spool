import { CatalogUnavailableError, WorkNotFoundError } from '@/lib/catalog/errors';
import { workPath } from '@/lib/catalog/kind';
import type { NormalizedWork, WorkKind } from '@/lib/catalog/types';
import { detectEvents, type DetectedEvent } from './detect';

export const BATCH_SIZE = 15;
/** Stop taking works after this long so each call stays under Vercel's 60s limit. */
export const BUDGET_MS = 40_000;

export type JobDeps = {
  today: string;
  dueWorks: (limit: number) => Promise<Array<{ id: string; kind: WorkKind; externalId: string }>>;
  remainingCount: () => Promise<number>;
  findCached: (kind: WorkKind, externalId: string) => Promise<NormalizedWork | null>;
  fetchFresh: (kind: WorkKind, externalId: string) => Promise<NormalizedWork>;
  save: (work: NormalizedWork) => Promise<void>;
  recordEvent: (workId: string, e: DetectedEvent) => Promise<number>;
  markChecked: (workId: string) => Promise<void>;
  /** Counts a failed check; after a few the work waits until tomorrow (so it can't block the queue). */
  noteFailure: (workId: string) => Promise<void>;
  sendPushes: () => Promise<void>;
  prune: () => Promise<void>;
  now?: () => number;
};

/** One batch of the daily check. Works whose source is down stay due and are retried on the next call. */
export async function runDailyBatch(d: JobDeps): Promise<{ processed: number; events: number; remaining: number }> {
  const now = d.now ?? Date.now;
  const start = now();
  let processed = 0;
  let events = 0;

  for (const w of await d.dueWorks(BATCH_SIZE)) {
    if (now() - start >= BUDGET_MS) break;
    try {
      const before = await d.findCached(w.kind, w.externalId);
      const after = await d.fetchFresh(w.kind, w.externalId);
      // Record first: if anything fails after this, the old copy stays and the next run detects again
      // (the dedupe key prevents a second alert).
      for (const e of detectEvents({ workId: w.id, path: workPath(w.kind, w.externalId), before, after, today: d.today })) {
        await d.recordEvent(w.id, e);
        events++;
      }
      await d.save(after);
      await d.markChecked(w.id);
      processed++;
    } catch (e) {
      if (e instanceof WorkNotFoundError) {
        await d.markChecked(w.id);
        processed++;
      } else {
        if (!(e instanceof CatalogUnavailableError)) console.error('[alerts] work failed', w.id, e);
        await d.noteFailure(w.id).catch(() => {});
      }
    }
  }

  await d.sendPushes();
  await d.prune();
  return { processed, events, remaining: await d.remainingCount() };
}
