-- Avaliações: nota do Lobby (média das estrelas das listas) e notas externas (IMDb e Rotten Tomatoes via OMDb).

-- Notas externas guardadas junto da obra. Leitura pública (como o resto do catálogo); só o servidor grava.
alter table works add column imdb_id text check (imdb_id ~ '^tt[0-9]+$');
alter table works add column imdb_rating numeric(3, 1) check (imdb_rating between 0 and 10);
alter table works add column imdb_votes int check (imdb_votes >= 0);
alter table works add column rt_score int check (rt_score between 0 and 100);
-- Dia (horário de Brasília) da última consulta ao OMDb, mesmo quando ele não tinha nota: evita repetir antes de 7 dias.
alter table works add column ratings_checked_on date;

-- O servidor (service role) salva o catálogo; no Supabase ele já tem acesso, aqui fica explícito.
grant select, insert, update on works to service_role;

-- Nota do Lobby: média e quantidade das notas dadas nas listas, sem dizer quem deu qual nota.
-- Com menos de 3 notas a média não aparece (evita média enganosa e que alguém descubra a nota de uma pessoa).
create function lobby_rating(p_work uuid) returns table (average numeric, ratings int)
language sql stable security definer set search_path = public as $$
  select case when count(li.rating) >= 3 then round(avg(li.rating), 1) end, count(li.rating)::int
  from list_items li
  where li.work_id = p_work and li.rating is not null;
$$;
revoke execute on function lobby_rating(uuid) from public;
grant execute on function lobby_rating(uuid) to anon, authenticated, service_role;
