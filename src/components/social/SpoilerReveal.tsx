'use client';

import { useState, type ReactNode } from 'react';

/** Text marked as spoiler stays out of the page until the person asks to see it. */
export function SpoilerReveal({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return <>{children}</>;
  return (
    <button type="button" onClick={() => setOpen(true)}
      className="w-full rounded-lg border border-warn bg-warn/10 px-3 py-2 text-left text-sm font-medium text-warn hover:bg-warn/20">
      Contém spoiler — mostrar
    </button>
  );
}
