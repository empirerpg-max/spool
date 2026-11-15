'use server';

import { revalidatePath } from 'next/cache';
import { createSessionClient } from '@/lib/supabase/session';
import { dbErrorMessage } from '@/lib/community/errors';
import { reviewSchema, statusSchema } from './schemas';
import type { ListStatus } from './types';

export type ListActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const FAIL = 'Não foi possível salvar. Tente de novo.';

async function existing(workId: string) {
  const supabase = await createSessionClient();
  const { data } = await supabase.from('list_items').select('status, review_topic_id').eq('work_id', workId).maybeSingle();
  return { supabase, row: data as { status: ListStatus; review_topic_id: string | null } | null };
}

/** Adds the work or changes its state. Leaving "concluído" unpublishes and clears rating/review (the UI confirms first). */
export async function setStatus(workId: string, workPath: string, status: ListStatus): Promise<void> {
  if (!statusSchema.safeParse(status).success) return;
  const { supabase, row } = await existing(workId);
  let error;
  if (!row) {
    ({ error } = await supabase.from('list_items').insert({ work_id: workId, status }));
  } else {
    if (row.status === 'concluido' && status !== 'concluido' && row.review_topic_id) {
      await supabase.rpc('unpublish_review', { p_work_id: workId });
    }
    const clear = status !== 'concluido' ? { rating: null, review: null, review_has_spoiler: false, finished_on: null } : {};
    ({ error } = await supabase.from('list_items').update({ status, ...clear }).eq('work_id', workId));
  }
  if (error) console.error('[list] setStatus failed', error.message);
  revalidatePath(workPath);
  revalidatePath('/minha-lista');
}

export async function saveReview(workId: string, workPath: string, _prev: ListActionState, formData: FormData): Promise<ListActionState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const v = parsed.data;
  const values = {
    status: 'concluido' as const, rating: v.rating ?? null, review: v.review, review_has_spoiler: v.reviewHasSpoiler, finished_on: v.finishedOn ?? null,
  };

  const { supabase, row } = await existing(workId);
  const { error } = row
    ? await supabase.from('list_items').update(values).eq('work_id', workId)
    : await supabase.from('list_items').insert({ work_id: workId, ...values });
  if (error) return { error: error.code === 'P0001' ? dbErrorMessage(error) : FAIL };

  if (v.publish && v.review) {
    const { error: pubErr } = await supabase.rpc('publish_review', { p_work_id: workId });
    if (pubErr) return { error: `Resenha salva, mas não publicada: ${dbErrorMessage(pubErr)}` };
  } else if (row?.review_topic_id) {
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
