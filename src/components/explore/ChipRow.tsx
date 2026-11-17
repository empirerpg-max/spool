import Link from 'next/link';

export type Chip = { label: string; href: string; active?: boolean };

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '-').toLowerCase();

/** A titled row of round buttons (streaming services, genres, subjects) that scrolls sideways on phones. */
export function ChipRow({ title, chips, small = false }: { title: string; chips: Chip[]; small?: boolean }) {
  const headingId = `chips-${slug(title)}`;
  return (
    <section aria-labelledby={headingId} className="min-w-0 space-y-3">
      <h2 id={headingId} className={`font-display font-bold ${small ? 'text-sm text-muted' : 'text-xl'}`}>{title}</h2>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((c) => (
          <li key={c.href} className="shrink-0">
            <Link href={c.href} aria-current={c.active ? 'true' : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                c.active ? 'border-fg bg-fg text-bg' : 'border-line-strong hover:bg-surface-2'}`}>
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
