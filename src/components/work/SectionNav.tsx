/** Sticky in-page navigation; plain anchors, so it works without JavaScript. */
export function SectionNav({ items }: { items: Array<{ id: string; label: string }> }) {
  return (
    <nav aria-label="Seções" className="sticky top-14 z-20 -mx-4 border-b border-line bg-bg/95 px-4 backdrop-blur">
      <ul className="flex gap-6 overflow-x-auto text-sm font-semibold">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="inline-block py-3 text-muted hover:text-fg">{i.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
