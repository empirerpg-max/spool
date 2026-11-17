# Lobby — Plano 10: Navegação nova, Explorar e busca de pessoas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bottom tab bar on phones / top bar on desktop (Início, Explorar, Criar, Avisos, Perfil), an Explorar page that is both catalog and search (works + people), and people search in the database.

**Architecture:** Navigation is one server component that reads the current user and renders a client `NavBar` (bottom on `< md`, top on `≥ md`). Explorar shelves are fetched live from TMDB / Open Library with `fetch(..., { next: { revalidate } })` and never stored; "Populares no Lobby" and people search are security-definer SQL functions. Pure normalizers/URL builders are unit-tested; components with fixtures.

**Tech Stack:** Next.js 15 App Router · Supabase Postgres · Tailwind v4 · Vitest + Testing Library + Postgres harness.

**Spec:** `docs/superpowers/specs/2026-11-17-lobby-navegacao-explorar-design.md`

## Global Constraints
- pt-BR plain copy; Saguão tokens in `src/app/globals.css`; no Vercel-only APIs.
- Nav labels exactly: `Início`, `Explorar`, `Criar`, `Avisos`, `Perfil`; visitor: `Início`, `Explorar`, `Entrar`. Create sheet options exactly: `Publicar sobre uma obra` → `/publicar`, `Adicionar à minha lista` → `/explorar?foco=busca`.
- Desktop photo menu items: `Meu perfil`, `Minha lista` (→ `/minha-lista`), `Minha conta`, `Admin` (admins only), `Sair`.
- Touch targets ≥ 44 px; bottom bar uses `padding-bottom: env(safe-area-inset-bottom)`; pages get bottom padding so the bar never covers content; active item has `aria-current="page"`.
- Catalog data never written to the DB; TMDB shelves cached 6 h (`21600`), Open Library 12 h (`43200`), genre lists 7 days.
- Streaming providers (TMDB ids, `watch_region=BR`): Netflix 8, Prime Video 119, Max 1899, Disney+ 337, Globoplay 307, Apple TV+ 350, Paramount+ 531.
- Book subjects (label → Open Library subject): Romance → `romance`, Fantasia → `fantasy`, Ficção científica → `science_fiction`, Mistério e suspense → `mystery_and_detective_stories`, Terror → `horror`, Clássicos → `classics`, Literatura brasileira → `brazilian_literature`, Não ficção → `nonfiction`, Biografias → `biography`, Infantojuvenil → `juvenile_fiction`. Book queries add `language:por`.
- "Populares no Lobby": distinct members, last 30 days, a work appears only with ≥ 3 distinct members, members only, shelf shown only with ≥ 3 works.
- People search: members only; matches `username` prefix or `display_name` contains, accent/case-insensitive; excludes banned, blocked either way, self, null username; muted included; max 20; followed first. Never touches first/last name.

## Review Focus
1. A source (TMDB / Open Library) down → that shelf disappears, Explorar still renders. (Task 3)
2. Visitor opens `/explorar` → catalog works, "Pessoas" tab and "Populares no Lobby" show "Entre para…" / are hidden, no member data. (Tasks 3, 4)
3. Search with accents or uppercase ("JOÃO", "joao") finds "João". (Task 1)
4. Phone: last item of any long page is visible above the bar; the iPhone home indicator doesn't cover the bar. (Task 2)
5. "Ver mais" with an unknown genre/provider/subject in the URL → falls back to unfiltered list, no error page. (Task 3)

---

### Task 1: Database — people search and Lobby popular

**Files:** Create `supabase/migrations/20261125000000_explore.sql`, `tests/db/explore.test.ts`.

**Interfaces — Produces:**
- `search_people(p_query text, p_limit int default 20) returns table(id uuid, username text, display_name text, avatar_url text, i_follow boolean)` — authenticated only.
- `lobby_popular(p_kind text, p_limit int default 20) returns table(work_id uuid, kind text, external_id text, title text, poster_url text, members int)` — authenticated only; `p_kind` in `('movie','series','book')`.

- [ ] Tests (fail first): accent/case match (`'JOAO'`, `'joão'` → João); prefix on username; contains on display name; excludes banned, self, blocked both directions; includes muted; followed first; anon → permission denied; query shorter than 2 chars → empty. `lobby_popular`: work with 2 members excluded, 3 included; one member adding 50 works doesn't make any appear; older than 30 days ignored; kind filter; anon → permission denied; never returns user ids.
- [ ] Migration: `create extension if not exists unaccent` (guard: in Supabase it lives in schema `extensions`; reference as `extensions.unaccent` when that schema exists, else `public.unaccent` — test harness may need `create extension unaccent` in `tests/db/harness.ts`). Security definer, `set search_path = public, extensions`, revoke from public/anon, grant to authenticated. Use `blocked_between` and `profile_details` for avatar.
- [ ] Run `TEST_DATABASE_URL=postgres://postgres@localhost:55432/postgres npm run test:db` → PASS; commit `feat(db): people search and lobby popular`.

### Task 2: Navigation (bottom bar / top bar)

**Files:** Create `src/components/nav/{SiteNav.tsx (server), NavBar.tsx (client), CreateSheet.tsx (client), ProfileMenu.tsx (client), icons.tsx}`; modify `src/app/layout.tsx` (replace current header usage of `UserMenu`), `src/app/perfil/[username]/page.tsx` + `ProfileHeader` (own profile: gear button "Configurações" → small menu Minha conta / Admin / Sair; tab "Lista" for the owner shows the full list with stars by reusing `/minha-lista` list components); remove `UserMenu.tsx`/`UserMenuView.tsx` and the header `SearchBox`; `src/app/busca/page.tsx` → `redirect('/explorar?q=…')`. Tests: `tests/components/NavBar.test.tsx` (replaces `UserMenuView.test.tsx`).

**Interfaces — Produces:** `NavBar({ user: { username: string | null; avatarUrl: string | null; isAdmin: boolean; banned: boolean } | null, unread: number })`.

- [ ] Tests (fail first): member → 5 items with exact labels and hrefs (`/`, `/explorar`, sheet, `/avisos`, `/@ana`); no username → Perfil goes to `/bem-vindo`; unread 12 → badge "9+" and accessible label "12 avisos não lidos"; visitor → Início, Explorar, Entrar (`/entrar?next=<path>`); active item has `aria-current="page"` for the current path (Início only on exact `/`); Criar opens a dialog with the two exact options and closes on Escape; banned or no username → "Publicar sobre uma obra" hidden; desktop menu lists the 5 items, Admin only for admins.
- [ ] Implement; layout puts `<main className="pb-24 md:pb-0">`; bar `fixed inset-x-0 bottom-0 md:static md:top-0` (exact layout is the builder's), safe-area padding.
- [ ] Manual check with Playwright at 390×844 and 1280×800 (signed-out pages): no horizontal page scroll; save screenshots to the scratchpad.
- [ ] `npm test`, `npm run typecheck`, `npm run lint` → PASS; commit `feat(nav): bottom bar on phones, top bar on desktop`.

### Task 3: Explorar — catalog shelves and "ver mais"

**Files:** Create `src/lib/explore/{tmdb.ts, books.ts, options.ts}`, `src/app/explorar/page.tsx`, `src/app/explorar/[tipo]/page.tsx` ("ver mais"), `src/components/explore/{Shelf.tsx, ChipRow.tsx, CoverGrid.tsx, KindTabs.tsx}`; tests `tests/explore/{tmdb,books,options}.test.ts`, `tests/components/Explore.test.tsx`. Reuse `ReleaseItem`, `cachedFetch`, `fetchTmdbList`, `ReleaseRow` patterns from `src/lib/home/releases.ts`.

**Interfaces — Produces:**
- `type ExploreKind = 'movie' | 'series' | 'book'`; `parseKind(v): ExploreKind` (default `'movie'`; query `?tipo=filmes|series|livros`).
- `type ExploreFilter = { genre?: number; provider?: number; subject?: string; sort: 'populares' | 'avaliados' | 'recentes'; page: number }`; `parseFilter(searchParams, kind): ExploreFilter` — unknown genre/provider/subject dropped (Review Focus 5), page clamped 1–20.
- `tmdbTrending(kind)`, `tmdbTopRated(kind)`, `tmdbDiscover(kind, filter): Promise<{ items: ReleaseItem[]; hasMore: boolean }>`, `tmdbGenres(kind): Promise<{ id: number; name: string }[]>`.
- `olTrendingPt()`, `olSubject(subject, filter)` → same shapes; sort map: populares → `readinglog`, avaliados → `rating`, recentes → `new`.
- `PROVIDERS`, `SUBJECTS` constants (Global Constraints values).

- [ ] Tests (fail first): URL builders — discover movie with provider 8 + genre 27 + `avaliados` contains `with_watch_providers=8`, `watch_region=BR`, `with_genres=27`, `sort_by=vote_average.desc`, `vote_count.gte=300`; series uses `/discover/tv` and `first_air_date.desc` for recentes; top rated uses `vote_count.gte` ≥ 300 filter; books subject query contains `subject:horror` and `language:por`; items without poster skipped; `parseFilter` drops `genre=999999`, `provider=1`, `subject=x`; page `0` → 1, `99` → 20.
- [ ] Page `/explorar`: search field (prefilled from `?q=`, autofocus when `?foco=busca`), KindTabs, shelves per spec §3.2 (films/series: Em alta esta semana, Mais bem avaliados, No seu streaming chips, Por gênero chips, Populares no Lobby [members], Pessoas para seguir [members, reuse `suggestedPeople`]; books: Em alta, Por assunto chips, Populares no Lobby). Each shelf via `settle()` so a failure hides only that shelf. With `?q=`: results view with tabs Obras (existing `searchCatalog`, filtered by kind tab) / Pessoas (Task 4).
- [ ] Page `/explorar/[tipo]`: CoverGrid + filter chips + sort chips + "Carregar mais" (`?pagina=`).
- [ ] Tests for components: shelf hidden when source null; chips link to `/explorar/filmes?provedor=8` etc.; visitor doesn't see Populares no Lobby.
- [ ] `npm test`, typecheck, lint, build → PASS; commit `feat(explore): catalog shelves and see-more pages`.

### Task 4: People in Explorar

**Files:** Create `src/lib/social/people-search.ts` (`searchPeople(q: string): Promise<PersonWithFollow[]>` via `search_people`), `src/components/explore/PeopleResults.tsx`; modify `/explorar` results view. Tests `tests/components/PeopleResults.test.tsx`.

**Interfaces — Consumes:** `search_people` (Task 1), `PersonWithFollow`, `FollowButton`, `PeopleList` from `src/lib/social/queries.ts` / `src/components/social/*`.

- [ ] Tests (fail first): results render avatar, name, @ link to `/@user`, follow state; empty query → "Pessoas para seguir" suggestions; no results → "Ninguém encontrado com esse nome."; visitor → "Entre para encontrar pessoas" link to `/entrar?next=/explorar?q=…&aba=pessoas`.
- [ ] Implement; tab chosen via `?aba=obras|pessoas`.
- [ ] `npm test`, typecheck, lint, build → PASS; commit `feat(explore): find people`.
