import type { ReactNode } from 'react';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl space-y-8 py-8 leading-relaxed">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-extrabold">{title}</h1>
        <p className="text-sm text-muted">Versão de {updated}</p>
      </header>
      <div className="space-y-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:max-w-prose [&_section]:space-y-3 [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  );
}
