import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" aria-label="Lobby" className="inline-flex items-baseline gap-0.5 font-display text-xl font-extrabold tracking-tight">
      <span aria-hidden="true">Lobby</span>
      <span aria-hidden="true" className="ml-0.5 inline-flex gap-[3px]">
        <span className="size-[7px] rounded-full bg-film" />
        <span className="size-[7px] rounded-full bg-serie" />
        <span className="size-[7px] rounded-full bg-livro" />
      </span>
    </Link>
  );
}
