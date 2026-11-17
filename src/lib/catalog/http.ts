import { CatalogUnavailableError, WorkNotFoundError } from './errors';

export type FetchImpl = typeof fetch;

/** Interactive search can't keep people waiting; slow lists (Explorar) pass a longer timeoutMs. */
const TIMEOUT_MS = 8000;
const MAX_RETRY_AFTER_S = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET JSON with the catalog's error contract:
 * 404 → WorkNotFoundError; 429 → wait Retry-After (default 1s, cap 5s) and retry once;
 * still failing, 5xx, other non-OK or network error → CatalogUnavailableError(source).
 */
export async function getJson(
  url: string,
  source: 'tmdb' | 'books',
  headers: Record<string, string>,
  fetchImpl: FetchImpl,
  { timeoutMs = TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      throw new CatalogUnavailableError(source);
    }
    if (res.ok) return res.json();
    if (res.status === 404) throw new WorkNotFoundError(url);
    if (res.status === 429 && attempt === 0) {
      const raw = Number(res.headers.get('Retry-After'));
      const seconds = Number.isFinite(raw) && res.headers.has('Retry-After') ? raw : 1;
      await sleep(Math.min(Math.max(seconds, 0), MAX_RETRY_AFTER_S) * 1000);
      continue;
    }
    throw new CatalogUnavailableError(source, `${source} respondeu ${res.status}`);
  }
  throw new CatalogUnavailableError(source);
}
