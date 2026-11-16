-- Avisos: acontecimentos das obras (estreia, streaming, temporada, lançamento) viram avisos
-- para quem tem a obra na lista. Notificações no celular (Web Push) são opcionais.

alter table works add column checked_on date;
-- Falhas seguidas na conferência de hoje; depois de 3, a obra fica para amanhã (não trava a fila).
alter table works add column check_failures int not null default 0;

create table events (
  id bigserial primary key,
  work_id uuid not null references works on delete cascade,
  kind text not null check (kind in ('cinema', 'streaming', 'temporada_anunciada', 'temporada_estreia', 'livro_lancado')),
  dedupe_key text not null unique,
  title text not null,
  body text,
  url text not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  event_id bigint not null references events on delete cascade,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);
create index notifications_user_created on notifications (user_id, created_at desc);
create index notifications_unpushed on notifications (created_at) where pushed_at is null;

create table push_subscriptions (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  -- Só serviços de notificação conhecidos (Google/Android, Firefox, Apple, Windows).
  endpoint text not null unique check (endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Chaves das notificações no celular: geradas pelo próprio site, só o servidor lê.
create table push_keys (
  id boolean primary key default true check (id),
  public_key text not null,
  private_key text not null
);

alter table events enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;
alter table push_keys enable row level security;

create policy "events of my notifications" on events for select to authenticated
  using (exists (select 1 from notifications n where n.event_id = events.id and n.user_id = auth.uid()));
create policy "own notifications" on notifications for select to authenticated using (user_id = auth.uid());
create policy "own subscriptions" on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on events, notifications, push_subscriptions, push_keys from anon, authenticated;
grant select on events, notifications to authenticated;
grant select, delete on push_subscriptions to authenticated;
grant all on events, notifications, push_subscriptions, push_keys to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Registra um acontecimento uma única vez e avisa quem tem a obra na lista.
-- Quem já viu/leu não recebe, exceto temporada nova de série.
create function record_event(p_work uuid, p_kind text, p_key text, p_title text, p_body text, p_url text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_event bigint;
  v_count int;
begin
  insert into events (work_id, kind, dedupe_key, title, body, url)
    values (p_work, p_kind, p_key, p_title, p_body, p_url)
    on conflict (dedupe_key) do nothing
    returning id into v_event;
  if v_event is null then return 0; end if;

  insert into notifications (user_id, event_id)
    select li.user_id, v_event from list_items li
    where li.work_id = p_work and (li.status <> 'concluido' or p_kind like 'temporada_%');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function record_event(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function record_event(uuid, text, text, text, text, text) to service_role;

-- Ativar avisos num aparelho. Se outra conta tinha ativado no mesmo navegador, o aparelho passa
-- para quem ativou por último. No máximo 10 aparelhos por pessoa.
create function claim_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if (select count(*) from push_subscriptions where user_id = auth.uid() and endpoint <> p_endpoint) >= 10 then
    raise exception 'too_many_devices' using errcode = 'P0001';
  end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;
revoke execute on function claim_push_subscription(text, text, text) from public, anon;
grant execute on function claim_push_subscription(text, text, text) to authenticated;

create function mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

create function unread_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from notifications where user_id = auth.uid() and read_at is null;
$$;
revoke execute on function mark_notifications_read(), unread_count() from public, anon;
grant execute on function mark_notifications_read(), unread_count() to authenticated;

-- Obras que a tarefa diária ainda precisa conferir hoje (estão na lista de alguém).
create function due_works(p_today date, p_limit int)
returns table (id uuid, kind work_kind, external_id text)
language sql stable security definer set search_path = public as $$
  select w.id, w.kind, w.external_id from works w
  where exists (select 1 from list_items li where li.work_id = w.id)
    and (w.checked_on is null or w.checked_on < p_today)
  order by w.check_failures, w.checked_on nulls first, w.id
  limit p_limit;
$$;

create function due_works_count(p_today date) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from works w
  where exists (select 1 from list_items li where li.work_id = w.id)
    and (w.checked_on is null or w.checked_on < p_today);
$$;
revoke execute on function due_works(date, int), due_works_count(date) from public, anon, authenticated;
grant execute on function due_works(date, int), due_works_count(date) to service_role;

create function note_check_failure(p_work uuid, p_today date) returns void
language sql security definer set search_path = public as $$
  update works set
    check_failures = case when check_failures + 1 >= 3 then 0 else check_failures + 1 end,
    checked_on = case when check_failures + 1 >= 3 then p_today else checked_on end
  where id = p_work;
$$;
revoke execute on function note_check_failure(uuid, date) from public, anon, authenticated;
grant execute on function note_check_failure(uuid, date) to service_role;
