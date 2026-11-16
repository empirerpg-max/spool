import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertList } from '@/components/alerts/AlertList';
import { EnablePush } from '@/components/alerts/EnablePush';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listMyAlerts, markAllRead } from '@/lib/alerts/queries';

export const metadata: Metadata = { title: 'Avisos · Lobby' };

export default async function AlertsPage() {
  if (!(await getCurrentUser())) redirect('/entrar?next=%2Favisos');
  // Read the list first (so "Novo" still shows this time), then mark everything as read.
  const alerts = await listMyAlerts();
  await markAllRead();
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Avisos</h1>
      <EnablePush />
      <AlertList alerts={alerts} />
    </section>
  );
}
