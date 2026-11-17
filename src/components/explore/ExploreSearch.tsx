type Props = {
  q: string;
  /** Keep the chosen kind (`?tipo=`) when searching. */
  tipo?: string;
  /** Stay on the "Pessoas" results. */
  tab?: 'pessoas';
  /** Focus the field right away ("Adicionar à minha lista"). */
  autoFocus?: boolean;
};

/** The single search field of Explorar: works and people. */
export function ExploreSearch({ q, tipo, tab, autoFocus = false }: Props) {
  return (
    <form action="/explorar" method="get" role="search" className="flex w-full gap-2">
      {tipo && <input type="hidden" name="tipo" value={tipo} />}
      {tab && <input type="hidden" name="aba" value={tab} />}
      <input
        type="search"
        name="q"
        defaultValue={q}
        autoFocus={autoFocus}
        placeholder="Buscar filmes, séries, livros, pessoas"
        aria-label="Buscar"
        enterKeyHint="search"
        className="min-h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-fg placeholder:text-muted"
      />
      <button type="submit" className="min-h-11 rounded-full bg-fg px-5 font-semibold text-bg">Buscar</button>
    </form>
  );
}
