import type { Metadata } from 'next';
import Link from 'next/link';
import { AddDomainForm } from './AddDomainForm';
import { removeBlockedDomain } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createSessionClient } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Domínios bloqueados · Admin · Lobby' };

export default async function BlockedDomainsPage() {
  await requireAdmin('/admin/dominios');
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('blocked_domains').select('domain').order('domain');
  if (error) throw new Error(`Supabase: ${error.message}`);

  return (
    <section className="space-y-6">
      <nav className="flex gap-4 text-sm"><Link href="/admin" className="underline">Denúncias</Link><span className="font-semibold">Domínios bloqueados</span></nav>
      <h1 className="text-2xl font-bold">Domínios bloqueados</h1>
      <p className="text-sm text-neutral-500">Links para estes sites (e seus subdomínios) são recusados em tópicos e respostas.</p>
      <AddDomainForm />
      {data?.length ? (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {data.map(({ domain }) => (
            <li key={domain} className="flex items-center justify-between py-2">
              <span>{domain}</span>
              <form action={removeBlockedDomain}>
                <input type="hidden" name="domain" value={domain} />
                <button type="submit" className="text-sm text-red-600 hover:underline">Remover</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500">Nenhum domínio bloqueado ainda.</p>
      )}
    </section>
  );
}
