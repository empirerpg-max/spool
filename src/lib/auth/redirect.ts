/**
 * Only same-site paths survive; anything that could leave the site falls back to "/".
 * Control characters and backslashes are rejected because browsers strip/normalize
 * them while parsing ("/\t/evil.com" becomes "//evil.com").
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return '/';
  return next;
}
