import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { SearchBox } from '@/components/SearchBox';
import { Avatar } from '@/components/social/Avatar';
import type { ReleaseItem } from '@/lib/home/releases';
import { ReleaseRow } from './ReleaseRow';

const STEPS = [
  { title: 'Monte sua lista', text: 'Guarde os filmes, séries e livros que quer ver e ler, e marque o que já viu com estrelas e resenhas.', cls: 'text-film' },
  { title: 'Saiba onde assistir e receba avisos', text: 'Veja em qual streaming está ou onde comprar no Brasil, e seja avisado quando algo da sua lista estrear.', cls: 'text-serie' },
  { title: 'Converse com o clube', text: 'Publique o que achou, siga quem tem o seu gosto e entre na comunidade de cada obra.', cls: 'text-livro' },
];

function ExampleTag() {
  return <span className="rounded border border-line-strong px-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted">exemplo</span>;
}

/** Fictional cards: no real member content is shown to visitors. */
function Examples() {
  const card = 'space-y-3 rounded-2xl border border-line bg-surface p-4';
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      <li>
        <article className={card} aria-label="Publicação de exemplo">
          <div className="flex items-center gap-3">
            <Avatar url={null} name="Marina" size="sm" />
            <p className="min-w-0 flex-1 truncate font-semibold">Marina</p>
            <ExampleTag />
          </div>
          <p className="flex items-center gap-2 text-sm"><KindTag kind="book" /> <span className="font-semibold">Torto Arado</span></p>
          <p className="text-sm">Terminei ontem e ainda estou pensando nas irmãs. Que final!</p>
          <p className="text-xs text-muted">12 curtidas · 4 respostas</p>
        </article>
      </li>
      <li>
        <article className={card} aria-label="Comunidade de exemplo">
          <div className="flex items-center gap-2">
            <KindTag kind="movie" />
            <p className="min-w-0 flex-1 truncate font-semibold">Comunidade de Duna</p>
            <ExampleTag />
          </div>
          <p className="text-sm">“O livro ou o filme: qual vocês preferiram?”</p>
          <p className="text-xs text-muted">3 tópicos · 27 respostas esta semana</p>
        </article>
      </li>
      <li>
        <article className={card} aria-label="Resenha de exemplo">
          <div className="flex items-center gap-3">
            <Avatar url={null} name="Rafael" size="sm" />
            <p className="min-w-0 flex-1 truncate font-semibold">Rafael</p>
            <ExampleTag />
          </div>
          <p className="flex items-center gap-2 text-sm"><KindTag kind="series" /> <span className="font-semibold">The Bear</span></p>
          <p className="text-sm"><span role="img" aria-label="4 de 5 estrelas" className="text-warn">★★★★☆</span> Publicou uma resenha da terceira temporada.</p>
          <p className="text-xs text-muted">8 curtidas · 2 respostas</p>
        </article>
      </li>
    </ul>
  );
}

/** Home for visitors: what the club is, how it works, a peek inside (examples) and the films in theatres. */
export function SignedOutHome({ nowPlaying }: { nowPlaying: ReleaseItem[] | null }) {
  return (
    <div className="space-y-16 pb-8">
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 pt-10 text-center sm:pt-16">
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Um clube para quem ama filmes, séries e livros
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Guarde o que quer ver e ler, descubra onde assistir no Brasil e converse com gente que gosta das mesmas obras que você.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/criar-conta" className="rounded-full bg-fg px-6 py-2.5 font-semibold text-bg">Tenho um convite</Link>
          <Link href="/entrar" className="rounded-full border border-line-strong px-6 py-2.5 font-semibold hover:bg-surface-2">Já sou membro</Link>
        </div>
        <p className="text-sm text-muted">Ainda não tem convite? Peça para quem te indicou o Lobby.</p>
        <div className="w-full pt-2">
          <SearchBox />
        </div>
      </section>

      <section aria-labelledby="como-funciona" className="space-y-5">
        <h2 id="como-funciona" className="font-display text-2xl font-bold">Como funciona</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="space-y-2 rounded-2xl border border-line bg-surface p-5">
              <span className={`font-display text-3xl font-extrabold ${s.cls}`}>{i + 1}</span>
              <h3 className="font-display text-lg font-bold">{s.title}</h3>
              <p className="text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="por-dentro" className="space-y-5">
        <div className="space-y-1">
          <h2 id="por-dentro" className="font-display text-2xl font-bold">Por dentro do clube</h2>
          <p className="text-sm text-muted">Assim ficam as publicações e as comunidades (os cartões abaixo são exemplos).</p>
        </div>
        <Examples />
      </section>

      <ReleaseRow title="Nos cinemas esta semana" items={nowPlaying} />
    </div>
  );
}
