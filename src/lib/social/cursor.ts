/** "Carregar mais" cursor: a timestamp as Postgres prints it (keeps microseconds, unlike a JS Date). */
export const isCursor = (v: string | undefined): v is string =>
  typeof v === 'string' && v.length <= 40 && /^\d{4}-\d{2}-\d{2}[T ][\d:.]+([+-]\d{2}(:?\d{2})?|Z)?$/.test(v) && !Number.isNaN(Date.parse(v));
