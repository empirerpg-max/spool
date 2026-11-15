'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSessionClient } from '@/lib/supabase/session';
import { dbErrorMessage } from './errors';
import { replySchema, reportSchema, topicSchema } from './schemas';

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const isWorkPath = (p: string) => /^\/obra\/(filme|serie|livro)\/[A-Za-z0-9]+$/.test(p);

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  return Object.fromEntries(issues.map((i) => [String(i.path[0] ?? 'form'), i.message]));
}

export async function createTopic(workPath: string, workId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isWorkPath(workPath)) return { error: 'Obra inválida.' };
  const parsed = topicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const t = parsed.data;

  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('topics').insert({
    work_id: workId, title: t.title, body: t.body, has_spoiler: t.hasSpoiler,
    spoiler_season: t.spoilerSeason ?? null, spoiler_episode: t.spoilerEpisode ?? null,
  }).select('id').single();
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath(workPath);
  redirect(`${workPath}/topicos/${data.id}`);
}

export async function createReply(topicPath: string, topicId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };

  const supabase = await createSessionClient();
  const { error } = await supabase.from('posts').insert({ topic_id: topicId, body: parsed.data.body, has_spoiler: parsed.data.hasSpoiler });
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath(topicPath);
  return { ok: true };
}

export async function reportContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Escolha um motivo.' };
  const r = parsed.data;

  const supabase = await createSessionClient();
  // No .select(): reports are readable only by admins, so RETURNING would fail.
  const { error } = await supabase.from('reports').insert({
    reason: r.reason, note: r.note ?? null, topic_id: r.topicId ?? null, post_id: r.postId ?? null,
  });
  if (error) return { error: dbErrorMessage(error) };
  return { ok: true };
}
