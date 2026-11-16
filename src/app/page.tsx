import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';

const KINDS = [
  { label: 'Filmes', q: 'Duna', cls: 'border-film text-film' },
  { label: 'Séries', q: 'The Bear', cls: 'border-serie text-serie' },
  { label: 'Livros', q: 'Torto Arado', cls: 'border-livro text-livro' },
];

export default function Home() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-16 text-center sm:py-24">
      <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
        Onde filmes, séries e livros viram conversa.
      </h1>
      <p className="max-w-xl text-lg text-muted">
        Salve o que quer ver e ler, descubra onde assistir no Brasil e converse com quem já viu na comunidade de cada obra.
      </p>
      <div className="w-full">
        <SearchBox />
      </div>
      <ul className="flex flex-wrap justify-center gap-3" aria-label="Sugestões de busca">
        {KINDS.map((k) => (
          <li key={k.label}>
            <Link href={`/busca?q=${encodeURIComponent(k.q)}`} className={`inline-block rounded-full border px-4 py-1.5 text-sm font-semibold ${k.cls}`}>
              {k.label} · {k.q}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
