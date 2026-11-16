export function SearchBox({ defaultValue, compact = false }: { defaultValue?: string; compact?: boolean }) {
  return (
    <form action="/busca" method="get" role="search" className="flex w-full gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Busque filmes, séries e livros"
        aria-label="Buscar"
        className={`min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-fg placeholder:text-muted ${compact ? 'py-1.5 text-sm' : 'py-2.5'}`}
      />
      {!compact && (
        <button type="submit" className="rounded-full bg-fg px-5 py-2.5 font-semibold text-bg">
          Buscar
        </button>
      )}
    </form>
  );
}
