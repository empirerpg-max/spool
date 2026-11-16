-- Aba "Resenhas" do perfil: resenhas publicadas por uma pessoa.
-- A lista (list_items) só é lida pela dona; esta função mostra apenas quais resenhas estão publicadas
-- (tópico no ar), nunca a nota nem resenhas guardadas. Some quando há bloqueio entre as duas pessoas.
create function profile_reviews(p_profile uuid)
returns table (topic_id uuid, work_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.work_id, t.created_at
  from list_items li
    join topics t on t.id = li.review_topic_id and t.author_id = li.user_id
  where li.user_id = p_profile
    and t.deleted_at is null
    and auth.uid() is not null
    and not blocked_between(auth.uid(), p_profile)
  order by t.created_at desc, t.id desc
  limit 100;
$$;

revoke execute on function profile_reviews(uuid) from public, anon;
grant execute on function profile_reviews(uuid) to authenticated;
