'use server';

import { revalidatePath } from 'next/cache';
import { createSessionClient } from '@/lib/supabase/session';
import { normalizeDomain } from './domain';

const ACTIONS = ['remover', 'ignorar', 'banir'] as const;

export async function resolveReport(formData: FormData): Promise<void> {
  const reportId = String(formData.get('reportId') ?? '');
  const action = String(formData.get('action') ?? '');
  if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) return;
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc('resolve_report', { p_report_id: reportId, p_action: action });
  if (error) console.error('[admin] resolve_report failed', error.message);
  revalidatePath('/admin');
}

export async function addBlockedDomain(_prev: { error?: string; ok?: boolean }, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const domain = normalizeDomain(String(formData.get('domain') ?? ''));
  if (!domain) return { error: 'Domínio inválido' };
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc('add_blocked_domain', { p_domain: domain });
  if (error) return { error: 'Não foi possível salvar. Tente de novo.' };
  revalidatePath('/admin/dominios');
  return { ok: true };
}

export async function removeBlockedDomain(formData: FormData): Promise<void> {
  const supabase = await createSessionClient();
  const { error } = await supabase.rpc('remove_blocked_domain', { p_domain: String(formData.get('domain') ?? '') });
  if (error) console.error('[admin] remove_blocked_domain failed', error.message);
  revalidatePath('/admin/dominios');
}
