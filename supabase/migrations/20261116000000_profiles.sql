-- Perfis: um por conta do Supabase Auth.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 50),
  is_admin boolean not null default false,
  banned_at timestamptz,
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

alter table profiles enable row level security;

create policy "profiles are public" on profiles for select to anon, authenticated using (true);
create policy "users edit own profile" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Só nome de usuário e nome de exibição podem ser alterados pelo próprio usuário.
revoke insert, update, delete on profiles from anon, authenticated;
grant update (username, display_name) on profiles to authenticated;
