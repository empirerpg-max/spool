-- Clube social (Etapa 1): perfil, seguir, bloquear, silenciar, publicações, curtidas, respostas,
-- conversas acompanhadas, avisos sociais e timeline. Tudo só para membros (logados).
-- O bloqueio vale para perfil, publicações, respostas, curtidas, seguir e avisos — não para os tópicos das comunidades.

-- Perfil ---------------------------------------------------------------------------------------

-- Biografia, foto e "lista pública" ficam numa tabela à parte (não em profiles, que visitantes leem e que
-- não esconde nada com bloqueio): só membros leem, e quem tem bloqueio com a pessoa não vê nada.
create table profile_details (
  id uuid primary key references profiles on delete cascade,
  bio text check (char_length(bio) <= 160),
  avatar_url text,
  list_public boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Toda conta tem a sua linha: as novas na hora do cadastro, as que já existem agora.
create function create_profile_details() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profile_details (id) values (new.id) on conflict do nothing;
  return null;
end;
$$;
create trigger f_profile_details after insert on profiles for each row execute function create_profile_details();
insert into profile_details (id) select id from profiles on conflict do nothing;

-- Conta suspensa não muda o próprio perfil (o servidor e o Admin continuam podendo).
create function check_profile_edit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.uid() = new.id
     and exists (select 1 from profiles where id = new.id and banned_at is not null) then
    raise exception 'banned' using errcode = 'P0001';
  end if;
  if tg_table_name = 'profile_details' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger a_profile_edit before update on profile_details for each row execute function check_profile_edit();
create trigger a_profile_edit before update of display_name on profiles for each row
  when (new.display_name is distinct from old.display_name) execute function check_profile_edit();

-- Seguir, bloquear, silenciar ------------------------------------------------------------------

create table follows (
  follower_id uuid not null default auth.uid() references profiles on delete cascade,
  followee_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on follows (followee_id, created_at desc);

create table blocks (
  blocker_id uuid not null default auth.uid() references profiles on delete cascade,
  blocked_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked on blocks (blocked_id);

create table mutes (
  muter_id uuid not null default auth.uid() references profiles on delete cascade,
  muted_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

-- Uso interno (gatilhos e funções do banco): há bloqueio entre as duas pessoas, em qualquer direção?
create function blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Versão para o site e para as regras de leitura. Só responde sobre a própria pessoa logada:
-- ninguém descobre quem bloqueou quem entre terceiros.
create function is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is not null and auth.uid() is distinct from a and auth.uid() is distinct from b then false
    else blocked_between(a, b)
  end;
$$;

-- Perfil: regras de leitura e escrita (dependem de is_blocked).
alter table profile_details enable row level security;
create policy "details visible to members" on profile_details for select to authenticated
  using (not is_blocked(auth.uid(), id));
create policy "edit own details" on profile_details for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Visitantes não leem nada daqui; cada membro muda só a própria biografia e a lista pública.
revoke all on profile_details from anon, authenticated;
grant select (id, bio, avatar_url, list_public, updated_at) on profile_details to authenticated;
grant update (bio, list_public) on profile_details to authenticated;
-- A foto é gravada pelo servidor do Lobby (chave secreta) depois de conferir o arquivo.
grant select (id, avatar_url), update (avatar_url) on profile_details to service_role;

-- Publicações, respostas, curtidas ----------------------------------------------------------

create table social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  work_id uuid not null references works on delete cascade,
  caption text not null check (btrim(caption) <> '' and char_length(caption) <= 1000),
  has_spoiler boolean not null default false,
  like_count int not null default 0,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index social_posts_author_created on social_posts (author_id, created_at desc);
create index social_posts_work_created on social_posts (work_id, created_at desc);

create table social_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references social_posts on delete cascade,
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  body text not null check (btrim(body) <> '' and char_length(body) <= 2000),
  has_spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index social_replies_post_created on social_replies (post_id, created_at);
create index social_replies_author_created on social_replies (author_id, created_at desc);

create table social_likes (
  post_id uuid not null references social_posts on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index social_likes_user on social_likes (user_id);

-- Conversas acompanhadas: um tópico da comunidade ou uma publicação.
create table watches (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  topic_id uuid references topics on delete cascade,
  social_post_id uuid references social_posts on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(topic_id, social_post_id) = 1)
);
create unique index watches_once_per_topic on watches (user_id, topic_id) where topic_id is not null;
create unique index watches_once_per_post on watches (user_id, social_post_id) where social_post_id is not null;
create index watches_topic on watches (topic_id) where topic_id is not null;
create index watches_post on watches (social_post_id) where social_post_id is not null;

-- Avisos sociais (o sino junta com os avisos da lista).
create table activity (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  kind text not null check (kind in ('follow', 'like', 'reply', 'watched_reply')),
  actor_id uuid references profiles on delete cascade,
  social_post_id uuid references social_posts on delete cascade,
  topic_id uuid references topics on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index activity_user_created on activity (user_id, created_at desc);
create index activity_unread on activity (user_id) where read_at is null;

-- Regras de escrita ----------------------------------------------------------------------------

create function check_not_blocked_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if blocked_between(new.follower_id, new.followee_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Responder ou curtir: a publicação precisa estar no ar e não pode haver bloqueio com o autor.
create function check_social_post_open() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p social_posts;
begin
  select * into p from social_posts where id = new.post_id;
  if not found or p.deleted_at is not null then
    raise exception 'post_closed' using errcode = 'P0001';
  end if;
  if blocked_between(auth.uid(), p.author_id) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function check_social_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  if tg_table_name = 'social_posts' then
    select count(*) into recent from social_posts where author_id = auth.uid() and created_at > now() - interval '10 minutes';
    if recent >= 10 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  else
    select count(*) into recent from social_replies where author_id = auth.uid() and created_at > now() - interval '10 minutes';
    if recent >= 30 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  end if;
  return new;
end;
$$;

create function check_social_links() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'social_posts' then
    if has_blocked_link(new.caption) then raise exception 'blocked_link' using errcode = 'P0001'; end if;
  elsif has_blocked_link(new.body) then
    raise exception 'blocked_link' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Acompanhar uma publicação: precisa estar no ar e sem bloqueio com o autor.
create function check_watch_target() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p social_posts;
begin
  if new.social_post_id is not null then
    select * into p from social_posts where id = new.social_post_id;
    if not found or p.deleted_at is not null then
      raise exception 'post_closed' using errcode = 'P0001';
    end if;
    if blocked_between(new.user_id, p.author_id) then
      raise exception 'blocked' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- Avisos ---------------------------------------------------------------------------------------

-- Cria um aviso, exceto para a própria pessoa, entre pessoas com bloqueio, ou de quem foi silenciado.
-- Curtir/seguir de novo não repete um aviso ainda não lido, nem um do último dia (mesmo já lido).
create function add_activity(p_user uuid, p_kind text, p_actor uuid, p_post uuid, p_topic uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  if blocked_between(p_user, p_actor) then return; end if;
  if exists (select 1 from mutes where muter_id = p_user and muted_id = p_actor) then return; end if;
  if p_kind in ('follow', 'like') and exists (
    select 1 from activity
    where user_id = p_user and kind = p_kind and actor_id = p_actor
      and social_post_id is not distinct from p_post
      and (read_at is null or created_at > now() - interval '24 hours')
  ) then
    return;
  end if;
  insert into activity (user_id, kind, actor_id, social_post_id, topic_id) values (p_user, p_kind, p_actor, p_post, p_topic);
end;
$$;

create function follow_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform add_activity(new.followee_id, 'follow', new.follower_id, null, null);
  return null;
end;
$$;

create function like_counter() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  if tg_op = 'INSERT' then
    update social_posts set like_count = like_count + 1 where id = new.post_id returning author_id into v_author;
    perform add_activity(v_author, 'like', new.user_id, new.post_id, null);
  else
    update social_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

-- Nova resposta numa publicação: conta, avisa o autor ('reply') e quem acompanha ('watched_reply').
create function social_reply_added() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  w record;
begin
  update social_posts set reply_count = reply_count + 1 where id = new.post_id returning author_id into v_author;
  perform add_activity(v_author, 'reply', new.author_id, new.post_id, null);
  for w in select user_id from watches where social_post_id = new.post_id and user_id <> v_author loop
    if not blocked_between(w.user_id, v_author) then
      perform add_activity(w.user_id, 'watched_reply', new.author_id, new.post_id, null);
    end if;
  end loop;
  return null;
end;
$$;

-- Nova resposta num tópico da comunidade: avisa quem acompanha.
create function topic_reply_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  w record;
begin
  for w in select user_id from watches where topic_id = new.topic_id loop
    perform add_activity(w.user_id, 'watched_reply', new.author_id, null, new.topic_id);
  end loop;
  return null;
end;
$$;

-- Quem cria acompanha automaticamente.
create function auto_watch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'topics' then
    insert into watches (user_id, topic_id) values (new.author_id, new.id) on conflict do nothing;
  else
    insert into watches (user_id, social_post_id) values (new.author_id, new.id) on conflict do nothing;
  end if;
  return null;
end;
$$;

-- Bloquear desfaz os "seguir" nos dois sentidos e apaga os avisos entre as duas pessoas.
create function block_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from follows
    where (follower_id = new.blocker_id and followee_id = new.blocked_id)
       or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  delete from activity
    where (user_id = new.blocker_id and actor_id = new.blocked_id)
       or (user_id = new.blocked_id and actor_id = new.blocker_id);
  return null;
end;
$$;

-- Gatilhos disparam em ordem alfabética.
create trigger a_can_write before insert on follows for each row execute function check_can_write();
create trigger b_not_blocked before insert on follows for each row execute function check_not_blocked_follow();
create trigger e_follow_activity after insert on follows for each row execute function follow_activity();

create trigger e_block_cleanup after insert on blocks for each row execute function block_cleanup();

create trigger a_can_write before insert on social_posts for each row execute function check_can_write();
create trigger c_rate_limit before insert on social_posts for each row execute function check_social_rate_limit();
create trigger d_blocked_links before insert or update of caption on social_posts for each row execute function check_social_links();
create trigger f_auto_watch after insert on social_posts for each row execute function auto_watch();

create trigger a_can_write before insert on social_replies for each row execute function check_can_write();
create trigger b_post_open before insert on social_replies for each row execute function check_social_post_open();
create trigger c_rate_limit before insert on social_replies for each row execute function check_social_rate_limit();
create trigger d_blocked_links before insert or update of body on social_replies for each row execute function check_social_links();
create trigger e_reply_added after insert on social_replies for each row execute function social_reply_added();

create trigger a_can_write before insert on social_likes for each row execute function check_can_write();
create trigger b_post_open before insert on social_likes for each row execute function check_social_post_open();
create trigger e_like_counter after insert or delete on social_likes for each row execute function like_counter();

create trigger b_watch_target before insert on watches for each row execute function check_watch_target();

create trigger f_auto_watch after insert on topics for each row execute function auto_watch();
-- Tópicos que já existiam: quem criou passa a acompanhar, como acontece com os novos.
insert into watches (user_id, topic_id)
  select author_id, id from topics where deleted_at is null
  on conflict do nothing;
create trigger f_watch_activity after insert on posts for each row execute function topic_reply_activity();

-- RLS ------------------------------------------------------------------------------------------

alter table follows enable row level security;
alter table blocks enable row level security;
alter table mutes enable row level security;
alter table social_posts enable row level security;
alter table social_replies enable row level security;
alter table social_likes enable row level security;
alter table watches enable row level security;
alter table activity enable row level security;

create policy "follows visible to members" on follows for select to authenticated
  using (not is_blocked(auth.uid(), follower_id) and not is_blocked(auth.uid(), followee_id));
create policy "follow as myself" on follows for insert to authenticated with check (follower_id = auth.uid());
create policy "unfollow as myself" on follows for delete to authenticated using (follower_id = auth.uid());

create policy "own blocks" on blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "own mutes" on mutes for all to authenticated
  using (muter_id = auth.uid()) with check (muter_id = auth.uid());

-- O Admin vê tudo (inclusive o que foi denunciado por alguém que tem bloqueio com ele).
create policy "visible social posts" on social_posts for select to authenticated
  using (is_admin() or (deleted_at is null and not is_blocked(auth.uid(), author_id)));
create policy "create own social posts" on social_posts for insert to authenticated with check (author_id = auth.uid());

-- A resposta some também quando a publicação some (removida ou de alguém com bloqueio).
create policy "visible social replies" on social_replies for select to authenticated
  using (
    is_admin()
    or (
      deleted_at is null
      and not is_blocked(auth.uid(), author_id)
      and exists (select 1 from social_posts p where p.id = post_id)
    )
  );
create policy "create own social replies" on social_replies for insert to authenticated with check (author_id = auth.uid());

create policy "visible likes" on social_likes for select to authenticated
  using (
    user_id = auth.uid()
    or (not is_blocked(auth.uid(), user_id) and exists (select 1 from social_posts p where p.id = post_id))
  );
create policy "like as myself" on social_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike as myself" on social_likes for delete to authenticated using (user_id = auth.uid());

create policy "own watches" on watches for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own activity" on activity for select to authenticated using (user_id = auth.uid());

-- Visitantes não leem nada social; membros só escolhem o conteúdo (datas, contadores e moderação são do banco).
revoke all on follows, blocks, mutes, social_posts, social_replies, social_likes, watches, activity from anon, authenticated;
grant select, delete on follows, blocks, mutes, social_likes, watches to authenticated;
grant select on social_posts, social_replies, activity to authenticated;
grant insert (followee_id) on follows to authenticated;
grant insert (blocked_id) on blocks to authenticated;
grant insert (muted_id) on mutes to authenticated;
grant insert (work_id, caption, has_spoiler) on social_posts to authenticated;
grant insert (post_id, body, has_spoiler) on social_replies to authenticated;
grant insert (post_id) on social_likes to authenticated;
grant insert (topic_id, social_post_id) on watches to authenticated;
revoke all on sequence watches_id_seq, activity_id_seq from anon;

-- Apagar a própria publicação ou resposta (o Admin também pode).
create function delete_social_post(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  select author_id into v_author from social_posts where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_author is distinct from auth.uid() and not is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  update social_posts set deleted_at = coalesce(deleted_at, now()) where id = p_id;
end;
$$;

create function delete_social_reply(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_post uuid;
begin
  select author_id into v_author from social_replies where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_author is distinct from auth.uid() and not is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  update social_replies set deleted_at = now() where id = p_id and deleted_at is null returning post_id into v_post;
  if v_post is not null then
    update social_posts set reply_count = greatest(reply_count - 1, 0) where id = v_post;
  end if;
end;
$$;

create function mark_activity_read() returns void
language sql security definer set search_path = public as $$
  update activity set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

-- O sino conta os avisos da lista e os avisos sociais — só os que ainda apontam para algo no ar
-- (publicação não removida e sem bloqueio com o autor; tópico não removido), como em /avisos.
create or replace function unread_count() returns int
language sql stable security definer set search_path = public as $$
  select (
    (select count(*) from notifications where user_id = auth.uid() and read_at is null)
    + (select count(*) from activity a
       where a.user_id = auth.uid() and a.read_at is null
         and (a.social_post_id is null or exists (
           select 1 from social_posts p
           where p.id = a.social_post_id and p.deleted_at is null and not blocked_between(a.user_id, p.author_id)))
         and (a.topic_id is null or exists (
           select 1 from topics t where t.id = a.topic_id and t.deleted_at is null)))
  )::int;
$$;

-- Timeline: publicações e resenhas de quem sigo + respostas novas nas conversas que acompanho.
-- Montada na hora; nunca mostra quem silenciei nem quem tem bloqueio comigo.
-- "Carregar mais" continua depois do último item visto: data e id juntos, para não pular nem repetir
-- itens com a mesma data (sem p_before_id, usa só a data).
create function timeline(p_before timestamptz default null, p_limit int default 20, p_before_id uuid default null)
returns table (item_type text, item_id uuid, created_at timestamptz, actor_id uuid, work_id uuid, social_post_id uuid, topic_id uuid)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  blocked as (
    select b.blocked_id as id from blocks b, me where b.blocker_id = me.uid
    union select b.blocker_id from blocks b, me where b.blocked_id = me.uid
  ),
  hidden as (
    select id from blocked
    union select m.muted_id from mutes m, me where m.muter_id = me.uid
  ),
  items as (
    select 'post'::text as item_type, p.id as item_id, p.created_at, p.author_id as actor_id, p.work_id,
           p.id as social_post_id, null::uuid as topic_id
    from social_posts p join follows f on f.followee_id = p.author_id, me
    where f.follower_id = me.uid and p.deleted_at is null
    union all
    select 'review', t.id, t.created_at, t.author_id, t.work_id, null, t.id
    from topics t
      join list_items li on li.review_topic_id = t.id and li.user_id = t.author_id
      join follows f on f.followee_id = t.author_id, me
    where f.follower_id = me.uid and t.deleted_at is null
    union all
    select 'reply', r.id, r.created_at, r.author_id, p.work_id, p.id, null
    from watches w
      join social_posts p on p.id = w.social_post_id
      join social_replies r on r.post_id = p.id, me
    where w.user_id = me.uid and r.author_id <> me.uid and r.created_at > w.created_at
      and r.deleted_at is null and p.deleted_at is null
      and p.author_id not in (select id from blocked)
    union all
    select 'reply', c.id, c.created_at, c.author_id, t.work_id, null, t.id
    from watches w
      join topics t on t.id = w.topic_id
      join posts c on c.topic_id = t.id, me
    where w.user_id = me.uid and c.author_id <> me.uid and c.created_at > w.created_at
      and c.deleted_at is null and t.deleted_at is null
  )
  select i.item_type, i.item_id, i.created_at, i.actor_id, i.work_id, i.social_post_id, i.topic_id
  from items i
  where i.actor_id not in (select id from hidden)
    and (
      p_before is null
      or (p_before_id is null and i.created_at < p_before)
      or (p_before_id is not null and (i.created_at, i.item_id) < (p_before, p_before_id))
    )
  order by i.created_at desc, i.item_id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Sugestões de quem seguir: membros mais ativos nos últimos 30 dias.
create function suggested_people(p_limit int default 8)
returns table (id uuid, username text, display_name text, avatar_url text, recent_posts int)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as uid),
  recent as (
    select author_id from social_posts where created_at > now() - interval '30 days' and deleted_at is null
    union all
    select author_id from topics where created_at > now() - interval '30 days' and deleted_at is null
    union all
    select author_id from posts where created_at > now() - interval '30 days' and deleted_at is null
  ),
  counts as (select author_id, count(*)::int as n from recent group by author_id)
  select p.id, p.username, p.display_name, d.avatar_url, coalesce(c.n, 0)
  from profiles p left join profile_details d on d.id = p.id left join counts c on c.author_id = p.id, me
  where me.uid is not null and p.id <> me.uid and p.username is not null and p.banned_at is null
    and not exists (select 1 from follows f where f.follower_id = me.uid and f.followee_id = p.id)
    and not exists (select 1 from mutes m where m.muter_id = me.uid and m.muted_id = p.id)
    and not blocked_between(me.uid, p.id)
  order by coalesce(c.n, 0) desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 8), 1), 50);
$$;

-- Lista pública: só obras e estado (nunca nota nem resenha), e só se a pessoa ativou.
create function public_list(p_username text)
returns table (work_id uuid, status text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select li.work_id, li.status, li.updated_at
  from list_items li join profiles p on p.id = li.user_id join profile_details d on d.id = p.id
  where p.username = p_username and d.list_public
    and auth.uid() is not null and not blocked_between(auth.uid(), p.id)
  order by li.updated_at desc;
$$;

-- Denúncias e moderação ------------------------------------------------------------------------

alter table reports
  add column social_post_id uuid references social_posts on delete cascade,
  add column social_reply_id uuid references social_replies on delete cascade,
  drop constraint reports_check,
  add constraint reports_one_target check (num_nonnulls(topic_id, post_id, social_post_id, social_reply_id) = 1);
create unique index reports_once_per_social_post on reports (reporter_id, social_post_id) where social_post_id is not null;
create unique index reports_once_per_social_reply on reports (reporter_id, social_reply_id) where social_reply_id is not null;
grant insert (social_post_id, social_reply_id) on reports to authenticated;

create or replace function resolve_report(p_report_id uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r reports;
  v_resolution text;
  v_author uuid;
begin
  if not is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_action not in ('remover', 'ignorar', 'banir') then raise exception 'invalid_action' using errcode = 'P0001'; end if;
  select * into r from reports where id = p_report_id;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;

  v_resolution := case p_action when 'remover' then 'removido' when 'ignorar' then 'ignorado' else 'banido' end;

  if p_action in ('remover', 'banir') then
    if r.topic_id is not null then
      update topics set deleted_at = coalesce(deleted_at, now()) where id = r.topic_id returning author_id into v_author;
    elsif r.post_id is not null then
      update topics t set reply_count = greatest(t.reply_count - 1, 0)
        from posts p where p.id = r.post_id and p.deleted_at is null and t.id = p.topic_id;
      update posts set deleted_at = coalesce(deleted_at, now()) where id = r.post_id returning author_id into v_author;
    elsif r.social_post_id is not null then
      update social_posts set deleted_at = coalesce(deleted_at, now()) where id = r.social_post_id returning author_id into v_author;
    else
      update social_posts sp set reply_count = greatest(sp.reply_count - 1, 0)
        from social_replies sr where sr.id = r.social_reply_id and sr.deleted_at is null and sp.id = sr.post_id;
      update social_replies set deleted_at = coalesce(deleted_at, now()) where id = r.social_reply_id returning author_id into v_author;
    end if;
  end if;

  if p_action = 'banir' then
    update profiles set banned_at = coalesce(banned_at, now()) where id = v_author;
  end if;

  update reports set resolved_at = now(), resolved_by = auth.uid(), resolution = v_resolution
    where resolved_at is null
      and ((r.topic_id is not null and topic_id = r.topic_id)
        or (r.post_id is not null and post_id = r.post_id)
        or (r.social_post_id is not null and social_post_id = r.social_post_id)
        or (r.social_reply_id is not null and social_reply_id = r.social_reply_id));
end;
$$;

-- Permissões das funções -----------------------------------------------------------------------

revoke execute on function blocked_between(uuid, uuid), add_activity(uuid, text, uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function
  is_blocked(uuid, uuid), delete_social_post(uuid), delete_social_reply(uuid), mark_activity_read(),
  timeline(timestamptz, int, uuid), suggested_people(int), public_list(text)
  from public, anon;
grant execute on function
  is_blocked(uuid, uuid), delete_social_post(uuid), delete_social_reply(uuid), mark_activity_read(),
  timeline(timestamptz, int, uuid), suggested_people(int), public_list(text)
  to authenticated;

-- Fotos de perfil: pasta pública "avatars" no armazenamento do Supabase (o servidor grava, todos leem).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage')
     and exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    begin
      insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
    exception when others then
      raise notice 'avatars bucket not created: %', sqlerrm;
    end;
  end if;
end $$;
