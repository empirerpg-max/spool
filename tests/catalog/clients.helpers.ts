import { vi } from 'vitest';

export type Route = { match: RegExp; status?: number; body?: unknown; headers?: Record<string, string> } | { match: RegExp; error: Error };

/** Fake fetch: each call consumes the first route whose regex matches the URL. */
export function fakeFetch(routes: Route[]) {
  const queue = [...routes];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = String(input);
    const i = queue.findIndex((r) => r.match.test(url));
    if (i === -1) throw new Error(`unexpected fetch ${url}`);
    const [r] = queue.splice(i, 1);
    if ('error' in r) throw r.error;
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: r.headers });
  });
}
