import { SearchBox } from '@/components/SearchBox';

export default function Home() {
  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-4xl font-bold">Lobby</h1>
      <p className="text-muted">Filmes, séries e livros. Onde assistir, o que vem aí e gente para conversar.</p>
      <SearchBox />
    </section>
  );
}
