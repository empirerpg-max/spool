-- Catálogo: obras buscadas sob demanda (TMDB / Open Library / Google Books)
create type work_kind as enum ('movie', 'series', 'book');

create table works (
  id uuid primary key default gen_random_uuid(),
  kind work_kind not null,
  external_id text not null,
  title text not null,
  original_title text,
  overview text,
  overview_lang text check (overview_lang in ('pt-BR', 'en')),
  poster_url text,
  release_date_br date,
  theatrical_date_br date,
  digital_date_br date,
  trailer_youtube_key text,
  people text[] not null default '{}',
  isbns text[] not null default '{}',
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (kind, external_id)
);

create table availability (
  work_id uuid not null references works on delete cascade,
  provider text not null,
  type text not null check (type in ('subscription', 'free', 'ads', 'rent', 'buy', 'store')),
  logo_url text,
  link text,
  first_seen_at timestamptz not null default now(),
  primary key (work_id, provider, type)
);

create table seasons (
  work_id uuid not null references works on delete cascade,
  number int not null,
  air_date date,
  episode_count int not null default 0,
  primary key (work_id, number)
);

-- Leitura pública; escrita só pelo service role (que ignora RLS).
alter table works enable row level security;
alter table availability enable row level security;
alter table seasons enable row level security;

create policy "catalog is public" on works for select to anon, authenticated using (true);
create policy "catalog is public" on availability for select to anon, authenticated using (true);
create policy "catalog is public" on seasons for select to anon, authenticated using (true);
