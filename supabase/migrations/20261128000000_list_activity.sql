-- Atividade da lista na timeline: quem segue vê quando a pessoa marca Quero ver, Vendo ou Visto —
-- só se ela escolheu mostrar. A nota aparece só com uma segunda escolha; a resenha nunca aparece por aqui.

-- Escolhas da pessoa. share_activity: null = ainda não respondeu (conta como desligado).
alter table profile_details
  add column share_activity boolean,
  add column share_ratings boolean not null default false;

-- Cada membro muda só as próprias escolhas (o gatilho de conta suspensa já vale para toda a linha).
grant select (share_activity, share_ratings) on profile_details to authenticated;
grant update (share_activity, share_ratings) on profile_details to authenticated;

-- Um id para cada item da lista (a timeline aponta para ele) e a hora da última mudança de estado.
alter table list_items add column id uuid not null default gen_random_uuid();
create unique index list_items_id on list_items (id);

alter table list_items add column status_changed_at timestamptz;
update list_items set status_changed_at = coalesce(updated_at, created_at);
alter table list_items alter column status_changed_at set not null, alter column status_changed_at set default now();
create index list_items_user_status_changed on list_items (user_id, status_changed_at desc);

-- Só a mudança de estado conta: mudar nota, resenha ou data não cria um item novo na timeline.
create function set_status_changed_at() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_changed_at := now();
  else
    new.status_changed_at := old.status_changed_at;
  end if;
  return new;
end;
$$;
create trigger b_status_changed_at before insert or update of status on list_items
  for each row execute function set_status_changed_at();

-- Uso interno: o item veio de uma importação (Letterboxd/Goodreads)? Mesmo vínculo de lobby_popular.
create function list_item_imported(p_user uuid, p_work uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from import_items ii join imports i on i.id = ii.import_id
    where ii.state = 'importado' and ii.work_id = p_work and i.user_id = p_user
  );
$$;

-- Timeline: agora também a atividade da lista de quem sigo e escolheu mostrar (fora o que veio de importação).
-- Mesma assinatura, mesmas colunas, mesma ordem e mesmo "Carregar mais".
create or replace function timeline(p_before timestamptz default null, p_limit int default 20, p_before_id uuid default null)
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
    union all
    select 'list', li.id, li.status_changed_at, li.user_id, li.work_id, null, null
    from list_items li
      join follows f on f.followee_id = li.user_id
      join profile_details d on d.id = li.user_id, me
    where f.follower_id = me.uid and d.share_activity is true
      and not list_item_imported(li.user_id, li.work_id)
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

-- Detalhes dos itens de lista da timeline: estado e, só se a pessoa escolheu mostrar notas, a nota.
-- Responde apenas sobre itens que quem pergunta poderia ver na timeline (mesmas condições).
create function timeline_list_details(p_ids uuid[])
returns table (id uuid, status text, rating numeric)
language sql stable security definer set search_path = public as $$
  select li.id, li.status, case when d.share_ratings then li.rating end
  from list_items li
    join profile_details d on d.id = li.user_id
    join follows f on f.followee_id = li.user_id and f.follower_id = auth.uid()
  where li.id = any(p_ids)
    and auth.uid() is not null
    and d.share_activity is true
    and not blocked_between(auth.uid(), li.user_id)
    and not exists (select 1 from mutes m where m.muter_id = auth.uid() and m.muted_id = li.user_id)
    and not list_item_imported(li.user_id, li.work_id)
  limit 50;
$$;

revoke execute on function set_status_changed_at(), list_item_imported(uuid, uuid) from public, anon, authenticated;
revoke execute on function timeline_list_details(uuid[]) from public, anon;
grant execute on function timeline_list_details(uuid[]) to authenticated;
-- create or replace mantém as permissões; aqui ficam explícitas.
revoke execute on function timeline(timestamptz, int, uuid) from public, anon;
grant execute on function timeline(timestamptz, int, uuid) to authenticated;
