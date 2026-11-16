import Link from 'next/link';

export function BellView({ count }: { count: number }) {
  const label = count === 0 ? 'Avisos' : count === 1 ? '1 aviso não lido' : `${count} avisos não lidos`;
  return (
    <Link href="/avisos" aria-label={label} className="relative text-muted hover:text-fg">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span aria-hidden="true" className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-film px-1 text-center text-[0.65rem] font-bold leading-4 text-bg">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
