import { redirect } from 'next/navigation';

/** The old search page: searching now lives in Explorar, so old links and bookmarks land there with the same words. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] ?? '' : raw ?? '').trim();
  redirect(q ? `/explorar?q=${encodeURIComponent(q)}` : '/explorar');
}
