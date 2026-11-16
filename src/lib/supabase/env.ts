/**
 * The project URL is often pasted with an API path ("…supabase.co/rest/v1/") from the dashboard;
 * supabase-js needs just the origin, or every request fails with "Invalid path specified in request URL".
 */
export function normalizeSupabaseUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  try {
    return new URL(s).origin;
  } catch {
    return s.replace(/\/+$/, '');
  }
}

// Literal process.env reads so Next can inline the public values into the browser bundle.
export const supabaseUrl = () => normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
export const supabaseAnonKey = () => (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
export const supabaseConfigured = () => Boolean(supabaseUrl() && supabaseAnonKey());
