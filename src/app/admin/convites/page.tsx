import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/AdminNav';
import { requireAdmin } from '@/lib/admin/guard';
import { createSessionClient } from '@/lib/supabase/session';
import { InviteList, type InviteRow } from './InviteList';
import { NewInviteForm } from './NewInviteForm';

export const metadata: Metadata = { title: 'Convites · Admin · Lobby' };

type Row = { code: string; note: string | null; created_at: string; used_at: string | null; used: { username: string | null } | Array<{ username: string | null }> | null };

export default async function InvitesPage() {
  await requireAdmin('/admin/convites');
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('invites')
    .select('code, note, created_at, used_at, used:profiles!invites_used_by_fkey(username)')
    .order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(`Supabase: ${error.message}`);
  const invites: InviteRow[] = ((data ?? []) as unknown as Row[]).map((r) => {
    const used = Array.isArray(r.used) ? r.used[0] : r.used;
    return { code: r.code, note: r.note, createdAt: r.created_at, usedAt: r.used_at, usedBy: used?.username ?? null };
  });
  return (
    <section className="space-y-6">
      <AdminNav current="/admin/convites" />
      <h1 className="font-display text-3xl font-extrabold">Convites</h1>
      <p className="text-muted">Cada código cria uma conta só. Quem receber usa o código na tela “Criar conta”.</p>
      <NewInviteForm />
      <InviteList invites={invites} />
    </section>
  );
}
