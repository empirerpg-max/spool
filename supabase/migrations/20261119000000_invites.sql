-- Contas só com convite (exceto enquanto não houver administrador), 16+ anos e aceite dos Termos.

alter table profiles
  add column first_name text check (char_length(first_name) <= 50),
  add column last_name text check (char_length(last_name) <= 50),
  add column birth_date date,
  add column terms_version text,
  add column terms_accepted_at timestamptz;

-- Dados pessoais não são públicos: só estas colunas podem ser lidas por outras pessoas.
revoke select on profiles from anon, authenticated;
grant select (id, username, display_name, is_admin, banned_at, created_at) on profiles to anon, authenticated;

create function my_profile()
returns table (first_name text, last_name text, birth_date date, terms_version text, terms_accepted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select first_name, last_name, birth_date, terms_version, terms_accepted_at from profiles where id = auth.uid();
$$;
revoke execute on function my_profile() from public, anon;
grant execute on function my_profile() to authenticated;

create table invites (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  note text check (char_length(note) <= 100),
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now(),
  used_by uuid references profiles on delete set null,
  used_at timestamptz
);
alter table invites enable row level security;
create policy "admins read invites" on invites for select to authenticated using (is_admin());
revoke all on invites from anon, authenticated;
grant select on invites to authenticated;

create function normalize_invite(p_code text) returns text
language sql immutable as $$ select upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')) $$;

-- A "porta" da primeira conta (sem convite, vira admin) abre uma única vez e fecha para sempre.
create table app_settings (
  id boolean primary key default true check (id),
  bootstrap_done boolean not null
);
insert into app_settings (bootstrap_done) values (exists (select 1 from profiles where is_admin));
alter table app_settings enable row level security;
revoke all on app_settings from anon, authenticated;

-- Para a tela de cadastro mostrar uma mensagem clara antes de tentar criar a conta.
create function invite_is_valid(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select not (select bootstrap_done from app_settings)
      or exists (select 1 from invites where code = normalize_invite(p_code) and used_at is null);
$$;
revoke execute on function invite_is_valid(text) from public;
grant execute on function invite_is_valid(text) to anon, authenticated;

create function create_invite(p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if not is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  loop
    select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') into v_code from generate_series(1, 8);
    begin
      insert into invites (code, note, created_by) values (v_code, nullif(btrim(p_note), ''), auth.uid());
      return v_code;
    exception when unique_violation then
      -- extremely rare collision: try another code
    end;
  end loop;
end;
$$;
revoke execute on function create_invite(text) from public, anon;
grant execute on function create_invite(text) to authenticated;

-- Todo cadastro passa por aqui (inclusive quem chamar a API do Supabase direto, sem o site).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_first text := btrim(m->>'first_name');
  v_last text := btrim(m->>'last_name');
  v_birth date;
  v_code text := normalize_invite(m->>'invite_code');
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_bootstrap boolean;
begin
  begin
    v_birth := (m->>'birth_date')::date;
  exception when others then
    raise exception 'invalid_signup' using errcode = 'P0001';
  end;
  if coalesce(v_first, '') = '' or coalesce(v_last, '') = '' or v_birth is null then
    raise exception 'invalid_signup' using errcode = 'P0001';
  end if;
  if v_birth > (v_today - interval '16 years')::date or v_birth < (v_today - interval '120 years')::date then
    raise exception 'too_young' using errcode = 'P0001';
  end if;
  if coalesce(m->>'terms_version', '') <> '2026-11-16' then
    raise exception 'terms_required' using errcode = 'P0001';
  end if;

  -- A primeira conta sem convite vira administradora; a trava impede duas ao mesmo tempo
  -- e a porta nunca reabre (nem se o admin for rebaixado ou apagado).
  v_bootstrap := false;
  if v_code = '' then
    perform 1 from app_settings for update;
    if not (select bootstrap_done from app_settings) then
      v_bootstrap := true;
      update app_settings set bootstrap_done = true;
    end if;
  end if;

  insert into public.profiles (id, first_name, last_name, birth_date, terms_version, terms_accepted_at, is_admin)
    values (new.id, v_first, v_last, v_birth, m->>'terms_version', now(), v_bootstrap);

  if not v_bootstrap then
    update invites set used_by = new.id, used_at = now() where code = v_code and used_at is null;
    if not found then raise exception 'invalid_invite' using errcode = 'P0001'; end if;
  end if;
  return new;
end;
$$;

-- Encerra todas as sessões de uma conta (usado quando a administração gera uma senha temporária).
-- Só o servidor do Lobby (chave secreta) pode chamar.
create function end_sessions(p_user uuid) returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;
$$;
revoke execute on function end_sessions(uuid) from public, anon, authenticated;
grant execute on function end_sessions(uuid) to service_role;
