-- Explorar: busca de pessoas e "Populares no Lobby".

-- Comparar nomes sem acento ("João" = "joao"). No Supabase as extensões ficam no esquema "extensions";
-- num Postgres comum, em "public". lobby_unaccent esconde essa diferença e é imutável (serve em índices).
do $$
declare
  sch text := case when exists (select 1 from pg_namespace where nspname = 'extensions') then 'extensions' else 'public' end;
begin
  execute format('create extension if not exists unaccent with schema %I', sch);
  select n.nspname into sch from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'unaccent';
  execute format(
    'create or replace function public.lobby_unaccent(text) returns text language sql immutable strict parallel safe as %L',
    format('select %I.unaccent(%L::regdictionary, $1)', sch, sch || '.unaccent'));
end $$;

-- Busca de pessoas (só membros): começo do @ ou qualquer parte do nome no perfil, sem diferença de acento
-- ou maiúsculas. Nunca olha nome/sobrenome do cadastro. Fora: contas banidas, quem bloqueou ou foi bloqueado,
-- a própria pessoa e quem ainda não tem @. Silenciados aparecem. Quem eu sigo vem primeiro.
create function search_people(p_query text, p_limit int default 20)
returns table (id uuid, username text, display_name text, avatar_url text, i_follow boolean)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  q as (select lower(lobby_unaccent(ltrim(btrim(coalesce(p_query, '')), '@'))) as t),
  pat as (select t, replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') as esc from q),
  found as (
    select p.id, p.username, p.display_name, d.avatar_url,
      exists (select 1 from follows f where f.follower_id = me.uid and f.followee_id = p.id) as i_follow,
      p.username like pat.esc || '%' as by_handle
    from profiles p left join profile_details d on d.id = p.id, me, pat
    where me.uid is not null and char_length(pat.t) >= 2
      and p.id <> me.uid and p.username is not null and p.banned_at is null
      and (p.username like pat.esc || '%'
           or lower(lobby_unaccent(coalesce(p.display_name, ''))) like '%' || pat.esc || '%')
      and not blocked_between(me.uid, p.id)
  )
  select f.id, f.username, f.display_name, f.avatar_url, f.i_follow
  from found f
  order by f.i_follow desc, f.by_handle desc, f.username
  limit least(greatest(coalesce(p_limit, 20), 1), 20);
$$;

revoke execute on function search_people(text, int) from public, anon;
grant execute on function search_people(text, int) to authenticated;

-- "Populares no Lobby": obras que mais membros diferentes adicionaram às listas nos últimos 30 dias.
-- Conta listas privadas só como total; a obra só aparece com pelo menos 3 membros (ninguém descobre a
-- lista de uma pessoa) e uma importação grande de uma só pessoa vale 1. Nunca devolve quem adicionou.
create function lobby_popular(p_kind text, p_limit int default 20)
returns table (work_id uuid, kind text, external_id text, title text, poster_url text, members int)
language sql stable security definer set search_path = public as $$
  select w.id, w.kind::text, w.external_id, w.title, w.poster_url, count(distinct li.user_id)::int
  from list_items li
    join works w on w.id = li.work_id
    join profiles p on p.id = li.user_id
  where auth.uid() is not null
    and p_kind in ('movie', 'series', 'book') and w.kind::text = p_kind
    and li.created_at > now() - interval '30 days'
    and p.banned_at is null
  group by w.id
  having count(distinct li.user_id) >= 3
  order by count(distinct li.user_id) desc, max(li.created_at) desc, w.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function lobby_popular(text, int) from public, anon;
grant execute on function lobby_popular(text, int) to authenticated;
