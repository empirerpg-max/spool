-- Lista pessoal (privada), nota, resenha e importações.

create table list_items (
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  work_id uuid not null references works on delete cascade,
  status text not null check (status in ('quero', 'andamento', 'concluido')),
  rating numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  review text check (char_length(review) <= 10000),
  review_has_spoiler boolean not null default false,
  finished_on date,
  review_topic_id uuid references topics on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, work_id),
  check (status = 'concluido' or (rating is null and review is null))
);
create index list_items_user_updated on list_items (user_id, updated_at desc);
create index list_items_work on list_items (work_id);

alter table list_items enable row level security;
create policy "own list" on list_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on list_items from anon, authenticated;
grant select, delete on list_items to authenticated;
grant insert (work_id, status, rating, review, review_has_spoiler, finished_on) on list_items to authenticated;
grant update (status, rating, review, review_has_spoiler, finished_on) on list_items to authenticated;

-- Mantém a resenha publicada em sincronia com o tópico (ou despublica se ficou vazia).
create function sync_review_topic() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.review_topic_id is not null then
    if new.review is null or btrim(new.review) = '' then
      update topics set deleted_at = coalesce(deleted_at, now()) where id = new.review_topic_id;
      new.review_topic_id := null;
    elsif new.review is distinct from old.review or new.review_has_spoiler is distinct from old.review_has_spoiler then
      update topics set body = new.review, has_spoiler = new.review_has_spoiler where id = new.review_topic_id;
    end if;
  end if;
  return new;
end;
$$;

create function unpublish_on_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.review_topic_id is not null then
    update topics set deleted_at = coalesce(deleted_at, now()) where id = old.review_topic_id;
  end if;
  return old;
end;
$$;

create trigger a_sync_review_topic before update on list_items for each row execute function sync_review_topic();
create trigger a_unpublish_on_delete before delete on list_items for each row execute function unpublish_on_delete();

-- Publica a resenha como tópico. Passa pela tabela topics, então valem as regras da comunidade
-- (banimento, nome de usuário, links bloqueados, limite de postagens).
create function publish_review(p_work_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  li list_items;
  v_topic uuid;
  v_username text;
begin
  select * into li from list_items where user_id = auth.uid() and work_id = p_work_id;
  if not found or li.review is null or btrim(li.review) = '' then
    raise exception 'no_review' using errcode = 'P0001';
  end if;

  if li.review_topic_id is not null
     and exists (select 1 from topics where id = li.review_topic_id and deleted_at is null) then
    update topics set body = li.review, has_spoiler = li.review_has_spoiler where id = li.review_topic_id;
    return li.review_topic_id;
  end if;

  select username into v_username from profiles where id = auth.uid();
  insert into topics (work_id, author_id, title, body, has_spoiler)
    values (p_work_id, auth.uid(), 'Resenha de @' || coalesce(v_username, '?'), li.review, li.review_has_spoiler)
    returning id into v_topic;
  update list_items set review_topic_id = v_topic where user_id = auth.uid() and work_id = p_work_id;
  return v_topic;
end;
$$;

create function unpublish_review(p_work_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_topic uuid;
begin
  select review_topic_id into v_topic from list_items where user_id = auth.uid() and work_id = p_work_id;
  if v_topic is not null then
    update topics set deleted_at = coalesce(deleted_at, now()) where id = v_topic;
    update list_items set review_topic_id = null where user_id = auth.uid() and work_id = p_work_id;
  end if;
end;
$$;

revoke execute on function publish_review(uuid), unpublish_review(uuid) from public, anon;
grant execute on function publish_review(uuid), unpublish_review(uuid) to authenticated;

-- Importações (Letterboxd, Goodreads)
create table imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  source text not null check (source in ('letterboxd', 'goodreads')),
  created_at timestamptz not null default now()
);

create table import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references imports on delete cascade,
  position int not null,
  row jsonb not null,
  state text not null default 'pendente' check (state in ('pendente', 'importado', 'nao_encontrado')),
  work_id uuid references works on delete set null,
  unique (import_id, position)
);
create index import_items_pending on import_items (import_id, state, position);

alter table imports enable row level security;
alter table import_items enable row level security;
create policy "own imports" on imports for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own import items" on import_items for all to authenticated
  using (exists (select 1 from imports i where i.id = import_id and i.user_id = auth.uid()))
  with check (exists (select 1 from imports i where i.id = import_id and i.user_id = auth.uid()));

revoke all on imports, import_items from anon, authenticated;
grant select, delete on imports, import_items to authenticated;
grant insert (source) on imports to authenticated;
grant insert (import_id, position, row) on import_items to authenticated;
grant update (state, work_id) on import_items to authenticated;
