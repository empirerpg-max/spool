import { timingSafeEqual } from 'node:crypto';
import { runDailyJob } from '@/lib/alerts/run';

// Each call handles one batch; the GitHub schedule keeps calling while works remain.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function authorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ error: 'CRON_SECRET não configurado' }, { status: 503 });
  if (!authorized(request.headers.get('authorization'), secret)) return Response.json({ error: 'não autorizado' }, { status: 401 });
  return Response.json(await runDailyJob());
}
