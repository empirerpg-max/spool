import { Suspense, use, type ReactNode } from 'react';

type Props<T> = {
  /** A value already in hand, or one still on its way (it then streams in when ready). */
  value: T | Promise<T>;
  /** Shown while the value is on its way. */
  fallback: ReactNode;
  children: (value: T) => ReactNode;
};

function Await<T>({ promise, children }: { promise: Promise<T>; children: (value: T) => ReactNode }) {
  return children(use(promise));
}

/** Lets a part of the page wait for its own source without holding up the rest of the page. */
export function Deferred<T>({ value, fallback, children }: Props<T>) {
  if (!(value instanceof Promise)) return children(value);
  return <Suspense fallback={fallback}><Await promise={value}>{children}</Await></Suspense>;
}
