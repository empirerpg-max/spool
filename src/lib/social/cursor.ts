/** "Carregar mais" cursor: a timestamp as Postgres prints it (keeps microseconds, unlike a JS Date). */
export const isCursor = (v: string | undefined): v is string =>
  typeof v === 'string' && v.length <= 40 && /^\d{4}-\d{2}-\d{2}[T ][\d:.]+([+-]\d{2}(:?\d{2})?|Z)?$/.test(v) && !Number.isNaN(Date.parse(v));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where "Carregar mais" continues: after this date and, among items with the same date, after this id. */
export type TimelineCursor = { at: string; id: string | null };

export function parseCursor(params: { antes?: string; id?: string }): TimelineCursor | null {
  if (!isCursor(params.antes)) return null;
  return { at: params.antes, id: typeof params.id === 'string' && UUID.test(params.id) ? params.id.toLowerCase() : null };
}

export const cursorHref = (c: TimelineCursor): string =>
  `/timeline?antes=${encodeURIComponent(c.at)}${c.id ? `&id=${c.id}` : ''}`;
