/** Light placeholder while a shelf (or the "ver mais" grid) is on its way. */
export function ShelfSkeleton({ title, grid = false }: { title: string; grid?: boolean }) {
  const covers = Array.from({ length: grid ? 12 : 6 }, (_, i) => i);
  return (
    <div role="status" className="min-w-0 space-y-3">
      <span className="sr-only">Carregando {title}…</span>
      {!grid && <div aria-hidden="true" className="h-6 w-48 rounded bg-surface-2 motion-safe:animate-pulse" />}
      <ul aria-hidden="true" className={grid ? 'grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6' : 'flex gap-3 overflow-hidden'}>
        {covers.map((i) => (
          <li key={i} className={grid ? 'min-w-0' : 'w-28 shrink-0 sm:w-32'}>
            <div className="aspect-[2/3] w-full rounded-lg bg-surface-2 motion-safe:animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
