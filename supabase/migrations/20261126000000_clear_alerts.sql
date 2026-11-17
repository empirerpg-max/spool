-- "Limpar avisos": the signed-in member deletes all their own list alerts and social alerts.
create or replace function clear_my_alerts() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from notifications where user_id = auth.uid();
  delete from activity where user_id = auth.uid();
end;
$$;
revoke all on function clear_my_alerts() from public, anon;
grant execute on function clear_my_alerts() to authenticated;
