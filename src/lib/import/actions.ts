'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getOrFetchWork } from '@/lib/catalog/get-work';
import { createSessionClient } from '@/lib/supabase/session';
import { parseGoodreads } from './goodreads';
import { parseLetterboxd } from './letterboxd';
import { matchRow } from './match';
import { BATCH_SIZE, mergeImported, processBatch } from './process';
import { ImportFormatError, type ImportRow } from './types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const INSERT_CHUNK = 500;

export type ImportStartState = { error?: string };
export type ImportCounts = { total: number; pending: number; imported: number; notFound: number };

export async function createImport(source: 'letterboxd' | 'goodreads', _prev: ImportStartState, formData: FormData): Promise<ImportStartState> {
  const user = await getCurrentUser();
  if (!user?.username) return { error: 'Entre e escolha um nome de usuário antes de importar.' };

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: 'Escolha o arquivo CSV.' };
  if (files.some((f) => f.size > MAX_FILE_BYTES)) return { error: 'Arquivo grande demais (máximo 5 MB).' };

  let rows: ImportRow[];
  try {
    const texts = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
    rows = source === 'letterboxd' ? parseLetterboxd(texts) : parseGoodreads(texts[0].text);
  } catch (e) {
    if (e instanceof ImportFormatError) return { error: e.message };
    throw e;
  }
  if (rows.length === 0) return { error: 'Nenhum item encontrado no arquivo.' };

  const supabase = await createSessionClient();
  const { data: imp, error } = await supabase.from('imports').insert({ source }).select('id').single();
  if (error) return { error: 'Não foi possível começar a importação. Tente de novo.' };
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK).map((row, j) => ({ import_id: imp.id, position: i + j, row }));
    const { error: itemsErr } = await supabase.from('import_items').insert(chunk);
    if (itemsErr) return { error: 'Não foi possível salvar o arquivo. Tente de novo.' };
  }
  redirect(`/minha-lista/importar?id=${imp.id}`);
}

export async function importCounts(importId: string): Promise<ImportCounts> {
  const supabase = await createSessionClient();
  const count = async (state?: string) => {
    let q = supabase.from('import_items').select('id', { count: 'exact', head: true }).eq('import_id', importId);
    if (state) q = q.eq('state', state);
    return (await q).count ?? 0;
  };
  const [total, pending, imported, notFound] = await Promise.all([count(), count('pendente'), count('importado'), count('nao_encontrado')]);
  return { total, pending, imported, notFound };
}

/** Processes the next batch of pending rows; the browser keeps calling until nothing is pending. */
export async function processImportBatch(importId: string): Promise<ImportCounts & { retryLater: boolean }> {
  const supabase = await createSessionClient();
  const { data } = await supabase.from('import_items').select('id, row')
    .eq('import_id', importId).eq('state', 'pendente').order('position').limit(BATCH_SIZE);
  const items = (data ?? []) as Array<{ id: string; row: ImportRow }>;

  const result = await processBatch(items, {
    match: (row) => matchRow(row),
    getWork: (kind, externalId) => getOrFetchWork(kind, externalId),
    saveListItem: async (workId, row) => {
      const { data: existing } = await supabase.from('list_items').select('status, rating, review, finished_on').eq('work_id', workId).maybeSingle();
      const values = mergeImported(existing ? { ...existing, rating: existing.rating === null ? null : Number(existing.rating) } : null, row);
      const { error } = existing
        ? await supabase.from('list_items').update(values).eq('work_id', workId)
        : await supabase.from('list_items').insert({ work_id: workId, ...values });
      if (error) throw new Error(error.message);
    },
    markItem: async (id, state, workId) => {
      const { error } = await supabase.from('import_items').update({ state, work_id: workId }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    bumpAttempts: async (id) => {
      const { data: cur } = await supabase.from('import_items').select('attempts').eq('id', id).single();
      const attempts = (cur?.attempts ?? 0) + 1;
      await supabase.from('import_items').update({ attempts }).eq('id', id);
      return attempts;
    },
  });
  return { ...(await importCounts(importId)), retryLater: result.retryLater > 0 };
}
