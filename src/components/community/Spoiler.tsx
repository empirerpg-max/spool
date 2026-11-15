import type { ReactNode } from 'react';

export function spoilerLabel(season: number | null, episode: number | null): string | undefined {
  if (season === null) return undefined;
  return episode === null ? `até T${season}` : `até T${season}E${episode}`;
}

/** Hidden until clicked; works without JavaScript. */
export function Spoiler({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <details className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
      <summary className="cursor-pointer text-sm font-medium text-amber-800 dark:text-amber-300">
        Contém spoiler — clique para ver{label && ` · ${label}`}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
