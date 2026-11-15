-- Comunidades: cada obra é uma comunidade. Tópicos, respostas, denúncias e moderação.
-- Todas as regras ficam no banco (RLS + gatilhos + funções de admin).

create table topics (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works on delete cascade,
  author_id uuid not null default auth.uid() references profiles,
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 1 and 10000),
  has_spoiler boolean not null default false,
  spoiler_season int check (spoiler_season between 1 and 100),
  spoiler_episode int check (spoiler_episode between 1 and 500),
  reply_count int not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (spoiler_episode is null or spoiler_season is not null)
);
create index topics_work_activity on topics (work_id, last_activity_at desc) where deleted_at is null;
create index topics_author_created on topics (author_id, created_at desc);

create table posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics on delete cascade,
  author_id uuid not null default auth.uid() references profiles,
  body text not null check (char_length(body) between 1 and 10000),
  has_spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index posts_topic_created on posts (topic_id, created_at);
create index posts_author_created on posts (author_id, created_at desc);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references profiles,
  topic_id uuid references topics on delete cascade,
  post_id uuid references posts on delete cascade,
  reason text not null check (reason in ('spoiler', 'ofensa', 'spam', 'pirataria', 'outro')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles,
  resolution text check (resolution in ('removido', 'ignorado', 'banido')),
  check (num_nonnulls(topic_id, post_id) = 1)
);
create unique index reports_once_per_topic on reports (reporter_id, topic_id) where topic_id is not null;
create unique index reports_once_per_post on reports (reporter_id, post_id) where post_id is not null;
create index reports_open on reports (created_at) where resolved_at is null;

create table blocked_domains (
  domain text primary key check (domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
  created_at timestamptz not null default now()
);

-- Links bloqueados: o domínio listado ou qualquer subdomínio dele.
create function has_blocked_link(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from regexp_matches(lower(coalesce(t, '')), '(?:https?://)?(?:www\.)?((?:[a-z0-9-]+\.)+[a-z]{2,})', 'g') as m(host)
    join blocked_domains b on m.host[1] = b.domain or m.host[1] like '%.' || b.domain
  );
$$;

-- Quem pode escrever: logado, com nome de usuário e sem banimento.
create function check_can_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p profiles;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  select * into p from profiles where id = auth.uid();
  if p.banned_at is not null then
    raise exception 'banned' using errcode = 'P0001';
  end if;
  if p.username is null then
    raise exception 'no_username' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function check_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  if tg_table_name = 'topics' then
    select count(*) into recent from topics where author_id = auth.uid() and created_at > now() - interval '10 minutes';
    if recent >= 5 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  else
    select count(*) into recent from posts where author_id = auth.uid() and created_at > now() - interval '10 minutes';
    if recent >= 20 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  end if;
  return new;
end;
$$;

create function check_topic_links() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if has_blocked_link(new.title) or has_blocked_link(new.body) then
    raise exception 'blocked_link' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function check_post_links() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if has_blocked_link(new.body) then
    raise exception 'blocked_link' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function check_topic_open() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from topics where id = new.topic_id and deleted_at is not null) then
    raise exception 'topic_closed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function bump_topic_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update topics set reply_count = reply_count + 1, last_activity_at = new.created_at where id = new.topic_id;
  return null;
end;
$$;

-- Gatilhos disparam em ordem alfabética.
create trigger a_can_write before insert on topics for each row execute function check_can_write();
create trigger a_can_write before insert on posts for each row execute function check_can_write();
create trigger a_can_write before insert on reports for each row execute function check_can_write();
create trigger b_topic_open before insert on posts for each row execute function check_topic_open();
create trigger c_rate_limit before insert on topics for each row execute function check_rate_limit();
create trigger c_rate_limit before insert on posts for each row execute function check_rate_limit();
create trigger d_blocked_links before insert or update on topics for each row execute function check_topic_links();
create trigger d_blocked_links before insert or update on posts for each row execute function check_post_links();
create trigger e_bump_activity after insert on posts for each row execute function bump_topic_activity();

-- RLS
alter table topics enable row level security;
alter table posts enable row level security;
alter table reports enable row level security;
alter table blocked_domains enable row level security;

create policy "visible topics" on topics for select to anon, authenticated using (deleted_at is null or is_admin());
create policy "create own topics" on topics for insert to authenticated with check (author_id = auth.uid());
create policy "visible posts" on posts for select to anon, authenticated using (deleted_at is null or is_admin());
create policy "create own posts" on posts for insert to authenticated with check (author_id = auth.uid());
create policy "create own reports" on reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "admins read reports" on reports for select to authenticated using (is_admin());
create policy "admins read blocked domains" on blocked_domains for select to authenticated using (is_admin());

-- Ações de administração
create function resolve_report(p_report_id uuid, p_action text) returns void
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
    else
      update topics t set reply_count = greatest(t.reply_count - 1, 0)
        from posts p where p.id = r.post_id and p.deleted_at is null and t.id = p.topic_id;
      update posts set deleted_at = coalesce(deleted_at, now()) where id = r.post_id returning author_id into v_author;
    end if;
  end if;

  if p_action = 'banir' then
    update profiles set banned_at = coalesce(banned_at, now()) where id = v_author;
  end if;

  update reports set resolved_at = now(), resolved_by = auth.uid(), resolution = v_resolution
    where resolved_at is null
      and ((r.topic_id is not null and topic_id = r.topic_id) or (r.post_id is not null and post_id = r.post_id));
end;
$$;

create function add_blocked_domain(p_domain text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  insert into blocked_domains (domain) values (lower(trim(p_domain))) on conflict do nothing;
end;
$$;

create function remove_blocked_domain(p_domain text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  delete from blocked_domains where domain = lower(trim(p_domain));
end;
$$;

revoke execute on function resolve_report(uuid, text), add_blocked_domain(text), remove_blocked_domain(text) from public, anon;
grant execute on function resolve_report(uuid, text), add_blocked_domain(text), remove_blocked_domain(text) to authenticated;
revoke execute on function has_blocked_link(text) from public, anon, authenticated;
