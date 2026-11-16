import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlertList } from '@/components/alerts/AlertList';
import { EnablePush } from '@/components/alerts/EnablePush';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listMyActivity, listMyAlerts, markAllRead } from '@/lib/alerts/queries';
import { groupActivity, mergeAlerts } from '@/lib/social/group-activity';

export const metadata: Metadata = { title: 'Avisos · Lobby' };

export default async function AlertsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Favisos');
  // Read first (so "Novo" still shows this time), then mark everything as read.
  const [list, activity] = await Promise.all([listMyAlerts(), listMyActivity()]);
  const alerts = mergeAlerts(list, groupActivity(activity, user.username));
  await markAllRead();
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Avisos</h1>
      <EnablePush />
      <AlertList alerts={alerts} />
    </section>
  );
}
