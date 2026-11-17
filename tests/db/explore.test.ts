import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, expectDbError } from './harness';

type Id = { id: string };
type Found = { id: string; username: string; display_name: string | null; avatar_url: string | null; i_follow: boolean };

describe.skipIf(!hasDb)('search_people', () => {
  let me: string;
  let joao: string;
  let maria: string;

  const member = async (email: string, username: string, displayName: string | null) => {
    const id = await createUser(email);
    await asSuperuser('update profiles set username = $2, display_name = $3 where id = $1', [id, username, displayName]);
    return id;
  };
  const search = (q: string, who = me) =>
    asUser<Found>(who, 'select id, username, display_name, avatar_url, i_follow from search_people($1)', [q]);
  const usernames = async (q: string, who = me) => (await search(q, who)).map((r) => r.username);

  beforeEach(async () => {
    await resetDatabase();
    me = await member('me@example.com', 'eu_mesmo', 'Joana Eu');
    joao = await member('joao@example.com', 'jsilva', 'João da Silva');
    maria = await member('maria@example.com', 'mariazinha', 'Maria Souza');
  });

  it('ignores accents and capitals (Review Focus 3)', async () => {
    expect(await usernames('JOAO')).toEqual(['jsilva']);
    expect(await usernames('joão')).toEqual(['jsilva']);
    expect(await usernames('Joao')).toEqual(['jsilva']);
  });

  it('matches the start of the @, with or without the @ sign', async () => {
    expect(await usernames('mari')).toEqual(['mariazinha']);
    expect(await usernames('@MARI')).toEqual(['mariazinha']);
    expect(await usernames('zinha')).toEqual([]); // not a prefix of the @ and not in the name
  });

  it('matches any part of the name in the profile', async () => {
    expect(await usernames('souza')).toEqual(['mariazinha']);
    expect(await usernames('da sil')).toEqual(['jsilva']);
  });

  it('returns the photo and whether I follow', async () => {
    await asSuperuser("update profile_details set avatar_url = 'https://x/a.jpg' where id = $1", [joao]);
    expect(await search('joao')).toEqual([
      { id: joao, username: 'jsilva', display_name: 'João da Silva', avatar_url: 'https://x/a.jpg', i_follow: false },
    ]);
  });

  it('treats % and _ as plain letters', async () => {
    expect(await usernames('%%')).toEqual([]);
    expect(await usernames('__')).toEqual([]);
  });

  it('leaves out banned accounts, myself and people without an @', async () => {
    const banned = await member('ban@example.com', 'mariabanida', 'Maria Banida');
    await asSuperuser('update profiles set banned_at = now() where id = $1', [banned]);
    const noHandle = await createUser('nh@example.com');
    await asSuperuser("update profiles set display_name = 'Maria Sem Arroba' where id = $1", [noHandle]);
    expect(await usernames('maria')).toEqual(['mariazinha']);
    expect(await usernames('joana')).toEqual([]);
    expect(await usernames('eu_m')).toEqual([]);
  });

  it('leaves out people blocked either way, but keeps muted ones', async () => {
    await asUser(me, 'insert into blocks(blocked_id) values ($1)', [joao]);
    await asUser(maria, 'insert into blocks(blocked_id) values ($1)', [me]);
    expect(await usernames('joao')).toEqual([]);
    expect(await usernames('maria')).toEqual([]);
    const cris = await member('cris@example.com', 'cris', 'Cris Muda');
    await asUser(me, 'insert into mutes(muted_id) values ($1)', [cris]);
    expect(await usernames('cris')).toEqual(['cris']);
  });

  it('lists people I follow first', async () => {
    const ana = await member('ana@example.com', 'ana_silva', 'Ana Silva');
    await asUser(me, 'insert into follows(followee_id) values ($1)', [joao]);
    const rows = await search('silva');
    expect(rows.map((r) => [r.username, r.i_follow])).toEqual([['jsilva', true], ['ana_silva', false]]);
    expect(ana).toBeTruthy();
  });

  it('needs at least 2 letters', async () => {
    expect(await usernames('j')).toEqual([]);
    expect(await usernames('  ')).toEqual([]);
  });

  it('returns at most 20 people', async () => {
    for (let i = 0; i < 22; i++) await member(`p${i}@example.com`, `pessoa${i}`, null);
    expect(await search('pessoa')).toHaveLength(20);
  });

  it('is for members only', async () => {
    await expectDbError(asAnon("select * from search_people('joao')"), /permission denied/);
  });

  it('only looks at the first 100 characters of the search', async () => {
    // Whatever comes after the 100th character is ignored (here: spaces, then a lot of text).
    expect(await usernames(`mari${' '.repeat(96)}${'x'.repeat(5000)}`)).toEqual(['mariazinha']);
  });
});

describe.skipIf(!hasDb)('lobby_popular', () => {
  let people: string[];

  const work = async (ext: string, title: string, kind = 'movie') =>
    (await asSuperuser<Id>('insert into works(kind, external_id, title, poster_url) values ($1, $2, $3, $4) returning id',
      [kind, ext, title, `https://img/${ext}.jpg`]))[0].id;
  const add = (who: string, workId: string) => asUser(who, "insert into list_items(work_id, status) values ($1, 'quero')", [workId]);
  const popular = (kind: string, who = people[0]) => asUser<Record<string, unknown>>(who, 'select * from lobby_popular($1)', [kind]);

  beforeEach(async () => {
    await resetDatabase();
    people = [];
    for (let i = 0; i < 5; i++) people.push(await createUser(`m${i}@example.com`));
  });

  it('shows a work only when at least 3 different members added it', async () => {
    const tres = await work('1', 'Três');
    const dois = await work('2', 'Dois');
    for (const p of people.slice(0, 3)) await add(p, tres);
    for (const p of people.slice(0, 2)) await add(p, dois);
    expect(await popular('movie')).toEqual([
      { work_id: tres, kind: 'movie', external_id: '1', title: 'Três', poster_url: 'https://img/1.jpg', members: 3 },
    ]);
  });

  it('orders by number of members', async () => {
    const a = await work('1', 'A');
    const b = await work('2', 'B');
    for (const p of people.slice(0, 3)) await add(p, a);
    for (const p of people) await add(p, b);
    expect((await popular('movie')).map((r) => [r.title, r.members])).toEqual([['B', 5], ['A', 3]]);
  });

  it('one member adding many works makes none of them popular', async () => {
    for (let i = 0; i < 50; i++) await add(people[0], await work(String(i + 100), `Obra ${i}`));
    expect(await popular('movie')).toEqual([]);
  });

  it('ignores additions older than 30 days', async () => {
    const w = await work('1', 'Antiga');
    for (const p of people.slice(0, 3)) await add(p, w);
    await asSuperuser("update list_items set created_at = now() - interval '31 days' where user_id = $1", [people[0]]);
    expect(await popular('movie')).toEqual([]);
  });

  it('filters by kind', async () => {
    const livro = await work('OL1W', 'Livro', 'book');
    const filme = await work('1', 'Filme');
    for (const p of people.slice(0, 3)) { await add(p, livro); await add(p, filme); }
    expect((await popular('book')).map((r) => r.title)).toEqual(['Livro']);
    expect((await popular('series'))).toEqual([]);
    expect((await popular('qualquer'))).toEqual([]);
  });

  it('never returns who added the work', async () => {
    const w = await work('1', 'X');
    for (const p of people.slice(0, 3)) await add(p, w);
    const [row] = await popular('movie');
    expect(Object.keys(row).sort()).toEqual(['external_id', 'kind', 'members', 'poster_url', 'title', 'work_id']);
    expect(Object.values(row)).not.toContain(people[1]);
  });

  it('is for members only', async () => {
    await expectDbError(asAnon("select * from lobby_popular('movie')"), /permission denied/);
  });

  it('does not count works that came in through an import (Letterboxd/Goodreads)', async () => {
    const w = await work('1', 'Importada');
    for (const p of people.slice(0, 3)) await add(p, w);
    expect((await popular('movie')).map((r) => r.members)).toEqual([3]);
    // people[0]'s copy came from an import file.
    const [imp] = await asUser<Id>(people[0], "insert into imports(source) values ('letterboxd') returning id");
    const [it0] = await asUser<Id>(people[0], "insert into import_items(import_id, position, row) values ($1, 0, '{}') returning id", [imp.id]);
    await asUser(people[0], "update import_items set state = 'importado', work_id = $2 where id = $1", [it0.id, w]);
    expect(await popular('movie')).toEqual([]);
    // A row that was not found in the catalog, or another person's import, changes nothing for the others.
    await add(people[3], w);
    expect((await popular('movie')).map((r) => r.members)).toEqual([3]);
  });

  it('can use an index on when the work was added', async () => {
    const [row] = await asSuperuser<{ n: number }>(
      "select count(*)::int as n from pg_indexes where tablename = 'list_items' and indexname = 'list_items_created_at'");
    expect(row.n).toBe(1);
  });
});
