'use server';

import { revalidatePath } from 'next/cache';
import { createSessionClient } from '@/lib/supabase/session';
import { dbErrorMessage } from '@/lib/community/errors';
import { reviewSchema, statusSchema } from './schemas';
import type { ListStatus } from './types';

export type ListActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const FAIL = 'Não foi possível salvar. Tente de novo.';

type Existing = { status: ListStatus; review_topic_id: string | null; topic: { deleted_at: string | null } | null };

async function existing(workId: string) {
  const supabase = await createSessionClient();
  const { data } = await supabase.from('list_items')
    .select('status, review_topic_id, topic:topics!list_items_review_topic_id_fkey(deleted_at)').eq('work_id', workId).maybeSingle();
  const row = data as unknown as Existing | null;
  const live = Boolean(row?.review_topic_id && row.topic && row.topic.deleted_at === null);
  return { supabase, row, live, moderated: Boolean(row?.review_topic_id) && !live };
}

/** Adds the work or changes its state. Leaving "concluído" unpublishes and clears rating/review (the UI confirms first). */
export async function setStatus(workId: string, workPath: string, status: ListStatus): Promise<{ ok: boolean }> {
  if (!statusSchema.safeParse(status).success) return { ok: false };
  const { supabase, row, live } = await existing(workId);
  let error;
  if (!row) {
    ({ error } = await supabase.from('list_items').insert({ work_id: workId, status }));
  } else {
    if (row.status === 'concluido' && status !== 'concluido' && live) {
      await supabase.rpc('unpublish_review', { p_work_id: workId });
    }
    const clear = status !== 'concluido' ? { rating: null, review: null, review_has_spoiler: false, finished_on: null } : {};
    ({ error } = await supabase.from('list_items').update({ status, ...clear }).eq('work_id', workId));
  }
  if (error) console.error('[list] setStatus failed', error.message);
  revalidatePath(workPath);
  revalidatePath('/minha-lista');
  return { ok: !error };
}

export async function saveReview(workId: string, workPath: string, _prev: ListActionState, formData: FormData): Promise<ListActionState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const v = parsed.data;
  const values = {
    status: 'concluido' as const, rating: v.rating ?? null, review: v.review, review_has_spoiler: v.reviewHasSpoiler, finished_on: v.finishedOn ?? null,
  };

  const { supabase, row, live, moderated } = await existing(workId);
  const { error } = row
    ? await supabase.from('list_items').update(values).eq('work_id', workId)
    : await supabase.from('list_items').insert({ work_id: workId, ...values });
  if (error) return { error: error.code === 'P0001' ? dbErrorMessage(error) : FAIL };

  if (moderated) {
    // Removed by the moderators: the review stays private and can't go back to the community.
  } else if (v.publish && v.review) {
    const { error: pubErr } = await supabase.rpc('publish_review', { p_work_id: workId });
    if (pubErr) return { error: `Resenha salva, mas não publicada: ${dbErrorMessage(pubErr)}` };
  } else if (live) {
    await supabase.rpc('unpublish_review', { p_work_id: workId });
  }

  revalidatePath(workPath);
  revalidatePath('/minha-lista');
  return { ok: true };
}

export async function removeFromList(workId: string, workPath: string): Promise<void> {
  const supabase = await createSessionClient();
  const { error } = await supabase.from('list_items').delete().eq('work_id', workId);
  if (error) console.error('[list] remove failed', error.message);
  revalidatePath(workPath);
  revalidatePath('/minha-lista');
}
