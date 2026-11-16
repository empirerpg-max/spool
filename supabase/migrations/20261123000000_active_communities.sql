-- Timeline vazia: "Comunidades movimentadas da semana".
-- Conta tópicos e publicações dos últimos 7 dias por obra (só números; nada removido entra na conta).
create function active_communities(p_limit int default 6)
returns table (work_id uuid, topics int, posts int)
language sql stable security definer set search_path = public as $$
  with recent as (
    select t.work_id, 1 as is_topic from topics t where t.created_at > now() - interval '7 days' and t.deleted_at is null
    union all
    select p.work_id, 0 from social_posts p where p.created_at > now() - interval '7 days' and p.deleted_at is null
  )
  select r.work_id, sum(r.is_topic)::int as topics, (count(*) - sum(r.is_topic))::int as posts
  from recent r
  where auth.uid() is not null
  group by r.work_id
  order by count(*) desc, max(r.work_id::text)
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;

revoke execute on function active_communities(int) from public, anon;
grant execute on function active_communities(int) to authenticated;
