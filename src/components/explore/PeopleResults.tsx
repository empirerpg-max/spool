import Link from 'next/link';
import { PeopleList } from '@/components/social/PeopleList';
import type { PersonWithFollow } from '@/lib/social/queries';

type Props = {
  q: string;
  /** Signed in: visitors never see members. */
  member: boolean;
  /** Search results (q not empty). */
  people: PersonWithFollow[];
  /** "Pessoas para seguir", shown while the search is empty. */
  suggestions: PersonWithFollow[];
};

const nextFor = (q: string) => {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  p.set('aba', 'pessoas');
  return `/explorar?${p}`;
};

/** "Pessoas" tab of the Explorar search. */
export function PeopleResults({ q, member, people, suggestions }: Props) {
  const path = nextFor(q);
  if (!member) {
    return (
      <p className="text-muted">
        <Link href={`/entrar?next=${encodeURIComponent(path)}`} className="font-semibold text-fg underline">Entre para encontrar pessoas</Link>
      </p>
    );
  }
  if (!q.trim()) {
    return (
      <section aria-labelledby="people-suggestions" className="space-y-3">
        <h2 id="people-suggestions" className="font-display text-xl font-bold">Pessoas para seguir</h2>
        <PeopleList people={suggestions} path="/explorar" empty="Busque pelo @ ou pelo nome de alguém." />
      </section>
    );
  }
  return <PeopleList people={people} path="/explorar" empty="Ninguém encontrado com esse nome." />;
}
