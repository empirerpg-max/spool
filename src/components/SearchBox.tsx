export function SearchBox({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/busca" method="get" role="search" className="flex w-full gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Busque filmes, séries e livros"
        aria-label="Buscar"
        className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-4 py-2 dark:border-neutral-700"
      />
      <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-neutral-900">
        Buscar
      </button>
    </form>
  );
}
