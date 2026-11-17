import Link from 'next/link';

export type ResultTab = 'obras' | 'pessoas';

/** "Obras" / "Pessoas" of the Explorar search; the tab lives in the address (`?aba=`). */
export function ResultTabs({ q, tab, tipo }: { q: string; tab: ResultTab; tipo?: string }) {
  const href = (t: ResultTab) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (t === 'obras' && tipo) p.set('tipo', tipo);
    if (t === 'pessoas') p.set('aba', 'pessoas');
    const s = p.toString();
    return s ? `/explorar?${s}` : '/explorar';
  };
  const tabs: Array<[ResultTab, string]> = [['obras', 'Obras'], ['pessoas', 'Pessoas']];
  return (
    <nav aria-label="Resultados" className="border-b border-line">
      <ul className="flex gap-6">
        {tabs.map(([t, label]) => (
          <li key={t}>
            <Link href={href(t)} aria-current={t === tab ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center border-b-2 font-semibold ${
                t === tab ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
