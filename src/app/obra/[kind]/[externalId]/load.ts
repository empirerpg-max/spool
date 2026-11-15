import { cache } from 'react';
import { notFound } from 'next/navigation';
import { CatalogUnavailableError, WorkNotFoundError } from '@/lib/catalog/errors';
import { getOrFetchWork } from '@/lib/catalog/get-work';
import { isValidExternalId, kindFromSlug, workPath } from '@/lib/catalog/kind';

/** Loads a work for any page under /obra/[kind]/[externalId]; 404s on bad URLs. Null when the source is down. */
export const loadWork = cache(async (slug: string, externalId: string) => {
  const kind = kindFromSlug(slug);
  if (!kind || !isValidExternalId(kind, externalId)) notFound();
  try {
    const r = await getOrFetchWork(kind, externalId);
    return { ...r, path: workPath(kind, externalId) };
  } catch (e) {
    if (e instanceof WorkNotFoundError) notFound();
    if (e instanceof CatalogUnavailableError) return null;
    throw e;
  }
});
