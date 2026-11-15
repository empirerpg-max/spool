# Lobby — Plano 2: Login e Comunidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People sign in (Google or e-mail link), pick a username, and discuss each work in its own community — topics, replies, spoiler marking, reports — while the Lobby team moderates from an admin screen that also blocks pirate-site links.

**Architecture:** Supabase Auth with cookie sessions via `@supabase/ssr` (middleware refreshes the session). All community rules live in Postgres — RLS policies plus `BEFORE` triggers (ban, blocked links, rate limit) and `security definer` RPCs for admin actions — so the database is the single authority and the Next.js server actions only validate input and translate errors into Portuguese. Database behaviour is tested with a real Postgres (a stub `auth` schema mimics Supabase) both locally and in a new CI workflow.

**Tech Stack:** Next.js 15 App Router (server actions) · `@supabase/ssr` + `@supabase/supabase-js` · Postgres 16 (Supabase) · `zod` for input validation · `pg` (tests only) · Vitest + Testing Library · GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-14-lobby-design.md` (goals 4, 5, 6, 7; screens 4 and 7). Builds on plan 1: `docs/superpowers/plans/2026-11-15-lobby-01-fundacao-catalogo.md`.

**Order agreed with the user:** this plan (login + comunidades) → plan 3 (lista pessoal, nota/resenha, importação, resenha publicada como tópico, membership by list) → design/layout competitor analysis → plan 4 (avisos e Início).

## Global Constraints

- All interface copy in Brazilian Portuguese.
- Community = the work: topics hang off `works.id`; there is no separate `communities` table (one community per work, created implicitly). If the work page has `id === null` (cache write failed, plan 1), show "Comunidade indisponível no momento" instead of the community.
- Login methods: Google (only shown when `NEXT_PUBLIC_GOOGLE_LOGIN === 'on'`) and e-mail magic link. No passwords.
- Username: required before posting; regex `^[a-z0-9_]{3,20}$`, unique, stored lowercase.
- Any signed-in, non-banned user with a username can post in any community.
- Spoilers: topics and replies each have `has_spoiler`; topics on series may add `spoiler_season` / `spoiler_episode` as a label only. Spoiler content is hidden until clicked.
- Moderation: only the Lobby team (`profiles.is_admin = true`). Anyone signed in can report a topic or reply. Admin can remove content, ignore a report, or ban the author. Banned users cannot create topics, replies or reports.
- Blocked links: a team-maintained list of domains (`blocked_domains`); any title/body containing a link to a listed domain or its subdomain is rejected on submit with "Esse link não é permitido no Lobby."
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser; user-facing reads and writes use the user's session client so RLS applies. The service client stays only in the catalog cache (plan 1).
- Portability rules from plan 1 still hold (no Vercel-only features).
- Every migration goes in `supabase/migrations/` with a 14-digit timestamp prefix; the existing GitHub Action applies them on `main`.

## Review Focus

1. A banned user who still has an open session tries to post or report → rejected with "Sua conta está suspensa.", nothing is saved. (Task 3)
2. A link to a blocked domain disguised by case, `www.`, a subdomain or no scheme (`WWW.Pirata.example/x`, `filmes.pirata.example`, `pirata.example`) → rejected; a domain that merely contains the name (`naopirata.example`) → allowed. (Task 3)
3. A user tries to promote themselves (`update profiles set is_admin = true`) or edit someone else's profile/topic → denied by the database. (Tasks 2, 3)
4. Login callback with a hostile `next` parameter (`//evil.com`, `https://evil.com`, `/\evil.com`) → redirects to `/`, never off-site. (Task 4)
5. A removed (soft-deleted) topic or reply → disappears for everyone except admins; its topic page answers 404 for normal users; reply counts stay correct. (Task 3, Task 6)

---

## File Structure

```
.github/workflows/ci.yml                         tests + db tests + lint + build on PRs and main
supabase/migrations/20261116000000_profiles.sql
supabase/migrations/20261116000100_community.sql
tests/db/harness.ts                              stub auth schema, apply migrations, asUser/asAnon helpers
tests/db/*.test.ts                               run only by `npm run test:db`
src/middleware.ts                                refresh Supabase session cookie
src/lib/supabase/session.ts                      createSessionClient() for server components/actions
src/lib/supabase/browser.ts                      createBrowserSupabase() for client components
src/lib/auth/redirect.ts                         safeNextPath()
src/lib/auth/username.ts                         usernameSchema, normalizeUsername()
src/lib/auth/current-user.ts                     getCurrentUser()
src/app/entrar/page.tsx + LoginForm.tsx
src/app/auth/callback/route.ts
src/app/bem-vindo/page.tsx + actions.ts          choose username
src/app/sair/route.ts                            POST sign-out
src/components/UserMenu.tsx                      header: "Entrar" or "@username"
src/lib/community/schemas.ts                     zod schemas for topic, reply, report
src/lib/community/errors.ts                      dbErrorMessage()
src/lib/community/queries.ts                     listTopics, getTopicWithReplies
src/lib/community/actions.ts                     createTopic, createReply, reportContent (server actions)
src/components/community/Spoiler.tsx
src/components/community/CommunitySection.tsx    shown on the work page
src/components/community/ReportButton.tsx
src/app/obra/[kind]/[externalId]/topicos/novo/page.tsx
src/app/obra/[kind]/[externalId]/topicos/[topicId]/page.tsx
src/app/admin/page.tsx                           reports queue
src/app/admin/dominios/page.tsx                  blocked domains
src/lib/admin/actions.ts                         resolveReport, addBlockedDomain, removeBlockedDomain
src/lib/admin/domain.ts                          normalizeDomain()
docs/setup-chaves.md                             + Supabase Auth setup, Google login, making yourself admin
```

---

### Task 1: CI workflow and database test harness

**Files:**
- Create: `.github/workflows/ci.yml`, `tests/db/harness.ts`, `tests/db/catalog.test.ts`
- Modify: `package.json` (scripts `test:db`, dev dep `pg`, `@types/pg`), `vitest.config.ts` (exclude `tests/db/**` from default run)

**Interfaces:**
- Produces:
  - `npm run test:db` = `vitest run --dir tests/db` (reads `TEST_DATABASE_URL`; whole suite skipped when unset).
  - `resetDatabase(): Promise<void>` — drops and recreates schemas `public` and `auth`, creates roles `anon`, `authenticated` if missing, stub `auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}')`, stub `auth.uid()` = `nullif(current_setting('request.jwt.claim.sub', true), '')::uuid`, grants Supabase-like defaults (`usage` on `public` to both roles; `alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated` and `grant usage, select on sequences`, `grant execute on functions`), then applies every file in `supabase/migrations/` in name order.
  - `asUser<T>(userId: string, sql: string, params?: unknown[]): Promise<T[]>` — one transaction: `set local role authenticated`, `select set_config('request.jwt.claim.sub', userId, true)`, run, commit.
  - `asAnon<T>(sql, params?)`, `asSuperuser<T>(sql, params?)`.
  - `createUser(email: string): Promise<string>` — inserts into `auth.users`, returns id.
  - `expectDbError(p: Promise<unknown>, message: string | RegExp)`.

CI (`ci.yml`): on `pull_request` and `push` to `main`; job with service `postgres:16` (password `postgres`, port 5432, health check); steps: checkout, setup-node 22 with npm cache, `npm ci`, `npm test`, `npm run test:db` with `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres`, `npm run lint`, `npm run build`.

- [ ] **Step 1: Write the failing test** `tests/db/catalog.test.ts`:
  - `anon can read works but not write` — after `resetDatabase()`, `asSuperuser` inserts a work; `asAnon('select title from works')` returns it; `asAnon("insert into works(kind, external_id, title) values ('movie','1','x')")` rejects with `/row-level security/`.
- [ ] **Step 2:** Start a local Postgres 16 (as the `postgres` OS user, under its home dir, port 55432) and run `TEST_DATABASE_URL=postgresql://postgres@localhost:55432/postgres npm run test:db` → FAIL (harness missing).
- [ ] **Step 3:** Implement the harness, scripts and CI workflow.
- [ ] **Step 4:** Run the same command → PASS; `npm test` still passes and does not run `tests/db`.
- [ ] **Step 5:** Commit `test: Postgres-backed database tests and CI workflow`.

---

### Task 2: Profiles migration

**Files:**
- Create: `supabase/migrations/20261116000000_profiles.sql`
- Test: `tests/db/profiles.test.ts`

**Interfaces:**
- Produces (SQL):
  - `profiles(id uuid primary key references auth.users on delete cascade, username text unique check (username ~ '^[a-z0-9_]{3,20}$'), display_name text check (char_length(display_name) <= 50), is_admin boolean not null default false, banned_at timestamptz, created_at timestamptz not null default now())`.
  - Trigger on `auth.users` insert → `insert into public.profiles(id)` (function `handle_new_user()`, `security definer`, `set search_path = public`).
  - `is_admin() returns boolean` — `security definer`, `stable`: current user's `is_admin`, false when anonymous.
  - RLS: `select` for `anon, authenticated` using `true`; `update` for `authenticated` using/with check `id = auth.uid()`. Column privileges: `revoke update on profiles from anon, authenticated; grant update (username, display_name) on profiles to authenticated`. No insert/delete policies.

- [ ] **Step 1: Write the failing tests:**
  - `new auth user gets a profile without username` — `createUser` → `select username, is_admin from profiles` returns `[{ username: null, is_admin: false }]`.
  - `user sets own username` — `asUser(id, "update profiles set username='ana_1' where id=$1", [id])` → row has `ana_1`.
  - `invalid usernames rejected` — `'Ana'`, `'ab'`, `'a-b'`, `'a'.repeat(21)` each reject with `/check constraint/`.
  - `duplicate username rejected` — second user setting `ana_1` rejects with `/duplicate key/`.
  - `cannot promote self to admin` — `update profiles set is_admin=true` rejects with `/permission denied/`.
  - `cannot edit someone else's profile` — update of other id affects 0 rows (`select` afterwards shows unchanged).
  - `is_admin() reflects the flag` — false for normal user and anon; true after `asSuperuser` sets the flag.
- [ ] **Step 2:** `npm run test:db` → FAIL.
- [ ] **Step 3:** Write the migration.
- [ ] **Step 4:** `npm run test:db` → PASS.
- [ ] **Step 5:** Commit `feat(db): profiles with username and admin flag`.

---

### Task 3: Community migration — topics, replies, reports, blocked domains

**Files:**
- Create: `supabase/migrations/20261116000100_community.sql`
- Test: `tests/db/community.test.ts`

**Interfaces:**
- Consumes: `profiles`, `is_admin()` (Task 2), `works` (plan 1).
- Produces (SQL):
  - `topics(id uuid pk default gen_random_uuid(), work_id uuid not null references works on delete cascade, author_id uuid not null default auth.uid() references profiles, title text not null check (char_length(title) between 3 and 120), body text not null check (char_length(body) between 1 and 10000), has_spoiler boolean not null default false, spoiler_season int check (spoiler_season between 1 and 100), spoiler_episode int check (spoiler_episode between 1 and 500), reply_count int not null default 0, last_activity_at timestamptz not null default now(), created_at timestamptz not null default now(), deleted_at timestamptz, check (spoiler_episode is null or spoiler_season is not null))`; index `(work_id, last_activity_at desc) where deleted_at is null`.
  - `posts(id uuid pk, topic_id uuid not null references topics on delete cascade, author_id uuid not null default auth.uid() references profiles, body text not null check (char_length(body) between 1 and 10000), has_spoiler boolean not null default false, created_at timestamptz not null default now(), deleted_at timestamptz)`; index `(topic_id, created_at)`.
  - `reports(id uuid pk, reporter_id uuid not null default auth.uid() references profiles, topic_id uuid references topics on delete cascade, post_id uuid references posts on delete cascade, reason text not null check (reason in ('spoiler','ofensa','spam','pirataria','outro')), note text check (char_length(note) <= 500), created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references profiles, resolution text check (resolution in ('removido','ignorado','banido')), check (num_nonnulls(topic_id, post_id) = 1))`; unique indexes `(reporter_id, topic_id)` and `(reporter_id, post_id)`.
  - `blocked_domains(domain text primary key check (domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'), created_at timestamptz not null default now())`.
  - `has_blocked_link(t text) returns boolean` — extracts hosts with `regexp_matches(lower(t), '(?:https?://)?(?:www\.)?((?:[a-z0-9-]+\.)+[a-z]{2,})', 'g')`; true when any host equals a blocked domain or ends with `'.' || domain`.
  - Trigger `before insert` on `topics`, `posts`, `reports` → function `check_can_write()`: raise `'not_signed_in'` if `auth.uid()` null; `'no_username'` if profile has no username; `'banned'` if `banned_at` not null. Raise via `raise exception '<code>' using errcode = 'P0001'`.
  - Trigger `before insert or update` on `topics` (title, body) and `posts` (body) → `'blocked_link'` when `has_blocked_link(...)`.
  - Trigger `before insert`: topics → `'rate_limited'` when author already has ≥ 5 topics in the last 10 minutes; posts → ≥ 20 posts in 10 minutes.
  - Trigger `after insert` on `posts` (`security definer`) → `topics.reply_count + 1`, `last_activity_at = new.created_at`. Admin removal via `resolve_report` decrements `reply_count` when a reply is removed.
  - Trigger `before insert` on `posts` → `'topic_closed'` when the parent topic has `deleted_at` set.
  - RLS:
    - `topics`/`posts` `select` for `anon, authenticated` using `deleted_at is null or is_admin()`; `insert` for `authenticated` with check `author_id = auth.uid()`; no update/delete policies for users (admin goes through RPC).
    - `reports`: `insert` for `authenticated` with check `reporter_id = auth.uid()`; `select` using `is_admin()`.
    - `blocked_domains`: `select` using `is_admin()`; no write policies (admin RPCs).
  - RPCs (`security definer`, `set search_path = public`, raise `'forbidden'` unless `is_admin()`):
    - `resolve_report(p_report_id uuid, p_action text) returns void` — `p_action in ('remover','ignorar','banir')`. `remover`: soft-delete the reported topic/post (`deleted_at = now()`), resolution `removido`. `ignorar`: resolution `ignorado`. `banir`: soft-delete the content **and** set the author's `banned_at = now()`, resolution `banido`. All three set `resolved_at`, `resolved_by = auth.uid()`; also resolve other open reports of the same content with the same resolution.
    - `add_blocked_domain(p_domain text) returns void`, `remove_blocked_domain(p_domain text) returns void`.
  - `grant execute` on the three RPCs to `authenticated`; `revoke execute ... from anon`.

- [ ] **Step 1: Write the failing tests** (`beforeEach`: reset, create work W, users `ana` (username `ana`), `bia` (`bia`), `nousername`, admin `adm` (`is_admin=true` via superuser)):
  - `user with username creates topic` — insert as ana → `select` as anon returns it with `author_id = ana`.
  - `anonymous cannot create topic` — `asAnon` insert rejects (`/row-level security|not_signed_in/`).
  - `user without username cannot post` — rejects `'no_username'`.
  - `author_id cannot be forged` — ana inserting with `author_id = bia` rejects `/row-level security/`.
  - `episode without season rejected` — `/check constraint/`.
  - `reply bumps count and activity` — bia replies → topic `reply_count = 1`, `last_activity_at` = reply `created_at`.
  - `blocked link variants` — `add_blocked_domain('pirata.example')` as adm; for bodies `'veja WWW.Pirata.example/x'`, `'https://filmes.pirata.example'`, `'pirata.example'` insert rejects `'blocked_link'`; body `'naopirata.example e pirata.examples.com'` succeeds; topic title `'pirata.example'` rejects.
  - `users cannot edit topics` — `update topics set body = 'x'` as ana on her own topic affects 0 rows (no update policy; the blocked-link update trigger only guards admin/service writes).
  - `rate limit` — 5 topics ok, 6th rejects `'rate_limited'`.
  - `banned user cannot post or report` — adm bans via `resolve_report(..., 'banir')` on a report of ana's topic; then ana topic insert, reply insert and report insert each reject `'banned'`.
  - `report rules` — bia reports ana's topic (`reason 'spoiler'`) ok; same report twice rejects `/duplicate key/`; report with both topic_id and post_id rejects `/check constraint/`; bia `select * from reports` returns 0 rows; adm sees 1.
  - `remover hides content from everyone but admins` — adm `resolve_report(r, 'remover')` → anon `select` on topics returns 0 rows, adm returns 1; report has `resolution 'removido'`, `resolved_by = adm`.
  - `removing a reply decrements reply_count` — report on bia's reply, `remover` → topic `reply_count = 0`.
  - `cannot reply to removed topic` — rejects `'topic_closed'`.
  - `non-admin cannot call admin RPCs` — ana calling `resolve_report`, `add_blocked_domain` rejects `'forbidden'`; anon calling rejects `/permission denied/`.
  - `invalid domain rejected` — `add_blocked_domain('not a domain')` rejects `/check constraint/`.
- [ ] **Step 2:** `npm run test:db` → FAIL.
- [ ] **Step 3:** Write the migration.
- [ ] **Step 4:** `npm run test:db` → PASS.
- [ ] **Step 5:** Commit `feat(db): community topics, replies, reports and moderation rules`.

---

### Task 4: Login, session and username onboarding

**Files:**
- Create: `src/middleware.ts`, `src/lib/supabase/session.ts`, `src/lib/supabase/browser.ts`, `src/lib/auth/redirect.ts`, `src/lib/auth/username.ts`, `src/lib/auth/current-user.ts`, `src/app/entrar/page.tsx`, `src/app/entrar/LoginForm.tsx`, `src/app/auth/callback/route.ts`, `src/app/bem-vindo/page.tsx`, `src/app/bem-vindo/actions.ts`, `src/app/sair/route.ts`, `src/components/UserMenu.tsx`
- Modify: `src/app/layout.tsx` (header renders `<UserMenu />`), `.env.example` (+ `NEXT_PUBLIC_GOOGLE_LOGIN=`), `docs/setup-chaves.md` (section "7. Login")
- Test: `tests/auth/redirect.test.ts`, `tests/auth/username.test.ts`, `tests/components/LoginForm.test.tsx`

**Interfaces:**
- Produces:
  - `createSessionClient(): Promise<SupabaseClient>` — `createServerClient` from `@supabase/ssr` with Next `cookies()`; uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - `createBrowserSupabase(): SupabaseClient`.
  - `safeNextPath(next: string | null | undefined): string` — returns `next` only if it starts with a single `/` and not `//` or `/\`; else `'/'`.
  - `usernameSchema` (zod: trim, lowercase, regex `^[a-z0-9_]{3,20}$`, message "Use de 3 a 20 letras minúsculas, números ou _").
  - `getCurrentUser(): Promise<{ id: string; username: string | null; isAdmin: boolean; banned: boolean } | null>`.
  - Server action `chooseUsername(prev, formData): Promise<{ error?: string }>` — maps unique violation to "Esse nome já está em uso".

Behavior:
- `/entrar?next=/x`: e-mail field + "Receber link de acesso" (`signInWithOtp` with `emailRedirectTo = ${origin}/auth/callback?next=...`), success text "Enviamos um link para seu e-mail."; if `NEXT_PUBLIC_GOOGLE_LOGIN === 'on'`, button "Entrar com Google" (`signInWithOAuth({ provider: 'google', options: { redirectTo } })`).
- `/auth/callback`: `exchangeCodeForSession(code)`; on error redirect `/entrar?erro=1` ("Não foi possível entrar. Tente de novo."); on success, if profile has no username redirect `/bem-vindo?next=<safe>`, else `safeNextPath(next)`.
- `/bem-vindo`: requires session (else redirect `/entrar`); form "Escolha seu nome de usuário"; on success redirect `safeNextPath(next)`.
- `/sair`: POST only, `signOut()`, redirect `/`.
- Middleware: standard `@supabase/ssr` session refresh; matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `manifest.webmanifest`, `icons/`.
- `UserMenu`: signed out → link "Entrar" (`/entrar?next=<current path>`); signed in → "@username" (or "Escolher nome" linking `/bem-vindo`), link "Admin" when `isAdmin`, form button "Sair".
- If Supabase env is missing, `getCurrentUser` returns `null` and `/entrar` shows "Login indisponível no momento" (keeps plan 1's degrade-gracefully behavior).

Docs section "7. Login" (user does it in the browser): Supabase → Authentication → URL Configuration: Site URL `https://spool-eta-eight.vercel.app`, Redirect URLs `https://spool-eta-eight.vercel.app/**` and `https://*-lobby-9cae.vercel.app/**`; Google provider setup (Google Cloud OAuth client, authorized redirect `https://<project>.supabase.co/auth/v1/callback`, paste client id/secret in Supabase → Authentication → Providers → Google, then Vercel var `NEXT_PUBLIC_GOOGLE_LOGIN=on`); note that Supabase's built-in e-mail only delivers to the project's team members and a few per hour — real users need custom SMTP (needs an own domain), so Google is the main login for now.

- [ ] **Step 1: Write the failing tests:**
  - `safeNextPath`: `'/obra/filme/603'` → same; `null`, `''`, `'//evil.com'`, `'https://evil.com'`, `'/\\evil.com'`, `'evil.com'` → `'/'`.
  - `usernameSchema`: `' Ana_1 '` parses to `'ana_1'`; `'ab'`, `'a-b'`, `'á' + 'bc'` fail with the message above.
  - `LoginForm`: renders "Receber link de acesso"; renders "Entrar com Google" only with prop `googleEnabled`.
- [ ] **Step 2:** `npm test` → new tests FAIL.
- [ ] **Step 3:** Implement (install `@supabase/ssr`, `zod`).
- [ ] **Step 4:** `npm test && npm run lint && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(auth): login with Google or e-mail link and username onboarding`.

---

### Task 5: Community data layer and server actions

**Files:**
- Create: `src/lib/community/schemas.ts`, `src/lib/community/errors.ts`, `src/lib/community/queries.ts`, `src/lib/community/actions.ts`
- Test: `tests/community/schemas.test.ts`, `tests/community/errors.test.ts`

**Interfaces:**
- Consumes: `createSessionClient`, `getCurrentUser` (Task 4); tables/RPCs (Task 3).
- Produces:
  - `topicSchema` (zod object: `title` trim 3–120, `body` trim 1–10000, `hasSpoiler` boolean from checkbox `'on'`, `spoilerSeason` optional int 1–100, `spoilerEpisode` optional int 1–500 requiring season — message "Informe a temporada"), `replySchema` (`body`, `hasSpoiler`), `reportSchema` (`reason` enum, `note` ≤ 500, exactly one of `topicId`/`postId` uuid).
  - `dbErrorMessage(err: { code?: string; message?: string }): string` — `'blocked_link'` → "Esse link não é permitido no Lobby."; `'banned'` → "Sua conta está suspensa."; `'rate_limited'` → "Você está postando rápido demais. Espere alguns minutos."; `'no_username'` → "Escolha um nome de usuário antes de postar."; `'not_signed_in'` → "Entre para participar."; `'topic_closed'` → "Este tópico foi removido."; code `23505` → "Você já denunciou isso."; anything else → "Não foi possível salvar. Tente de novo."
  - `type TopicSummary = { id: string; title: string; hasSpoiler: boolean; spoilerSeason: number | null; spoilerEpisode: number | null; replyCount: number; lastActivityAt: string; author: string }`.
  - `type Reply = { id: string; body: string; hasSpoiler: boolean; createdAt: string; author: string }`.
  - `listTopics(workId: string, page = 1): Promise<{ topics: TopicSummary[]; hasMore: boolean }>` — 20 per page, `last_activity_at desc`, author username via `profiles!topics_author_id_fkey(username)`.
  - `getTopicWithReplies(topicId: string, page = 1): Promise<{ topic: TopicSummary & { body: string; workId: string; createdAt: string }; replies: Reply[]; hasMore: boolean } | null>` — 50 replies per page, `created_at asc`.
  - Server actions (each re-validates with zod, returns `{ error?: string; fieldErrors?: Record<string,string> }` on failure):
    - `createTopic(workPath: string, workId: string, prev, formData)` → on success `redirect(`${workPath}/topicos/${id}`)`.
    - `createReply(topicPath: string, topicId: string, prev, formData)` → on success `revalidatePath(topicPath)`, returns `{}`.
    - `reportContent(prev, formData)` → returns `{ ok: true }` ("Denúncia enviada. Obrigado!").

- [ ] **Step 1: Write the failing tests:**
  - `topicSchema`: valid input with `hasSpoiler: 'on'`, season `'2'` → `{ hasSpoiler: true, spoilerSeason: 2 }`; title `'oi'` fails; episode without season fails with "Informe a temporada"; body of 10001 chars fails.
  - `reportSchema`: both ids or neither fail; reason `'outro'` with note ok.
  - `dbErrorMessage`: each code above maps to its message (use `{ code: 'P0001', message: 'blocked_link' }` shape); unknown → default.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(community): validation, queries and server actions`.

---

### Task 6: Community UI

**Files:**
- Create: `src/components/community/Spoiler.tsx`, `src/components/community/CommunitySection.tsx`, `src/components/community/ReportButton.tsx`, `src/app/obra/[kind]/[externalId]/topicos/novo/page.tsx`, `src/app/obra/[kind]/[externalId]/topicos/[topicId]/page.tsx`
- Modify: `src/app/obra/[kind]/[externalId]/page.tsx` (render `<CommunitySection>` below availability)
- Test: `tests/components/Spoiler.test.tsx`, `tests/components/CommunitySection.test.tsx`

**Interfaces:**
- Consumes: Task 5 queries/actions, `getCurrentUser`, `workPath`.
- Produces:
  - `<Spoiler label?: string>{children}</Spoiler>` — `<details>`; summary "Contém spoiler — clique para ver" (+ ` · até T{s}E{e}` / ` · até T{s}` from `label`).
  - `<CommunitySection workId: string | null; workPath: string; topics: TopicSummary[]; hasMore: boolean; page: number; signedIn: boolean />` (presentational; the page does the fetching).
  - `spoilerLabel(season: number | null, episode: number | null): string | undefined` exported from `Spoiler.tsx`.

Behavior:
- Work page: heading "Comunidade"; `workId === null` → "Comunidade indisponível no momento"; no topics → "Ninguém começou a conversa ainda. Que tal abrir o primeiro tópico?"; list shows title (spoiler topics show title plus a "spoiler" badge — titles are never hidden, so authors are told in the form that the title must not contain spoilers), author `@user`, "N respostas", relative date (`Intl.RelativeTimeFormat('pt-BR')`); button "Novo tópico" → `/topicos/novo` (signed out → `/entrar?next=...`); "Mais tópicos" link with `?pagina=` when `hasMore`.
- New topic page: form fields Título, Texto, checkbox "Contém spoiler", and for series only "Até a temporada" / "episódio" (shown when checkbox checked, via CSS `:has(input:checked)` — no client JS required); helper text "Não coloque spoiler no título."; uses `useActionState` to show errors.
- Topic page: 404 (`notFound()`) when `getTopicWithReplies` returns null (also covers removed topics for non-admins); shows topic body (inside `<Spoiler>` when flagged), replies (each inside `<Spoiler>` when flagged), reply form (checkbox "Contém spoiler") for signed-in users, "Entre para responder" link otherwise; `<ReportButton>` on topic and each reply for signed-in users.
- `ReportButton`: `<details>` with radio reasons (Spoiler sem aviso / Ofensa / Spam / Pirataria / Outro), optional note, submit "Denunciar"; shows result message.

- [ ] **Step 1: Write the failing tests:**
  - `Spoiler` hides children until opened: `details` without `open`; summary text "Contém spoiler — clique para ver"; with label `spoilerLabel(2, 5)` summary contains "até T2E5"; `spoilerLabel(2, null)` → "até T2"; `spoilerLabel(null, null)` → `undefined`.
  - `CommunitySection`: `workId=null` → "Comunidade indisponível no momento" and no "Novo tópico"; empty topics → the empty-state text and "Novo tópico" linking `/obra/filme/603/topicos/novo` when signed in, `/entrar?next=%2Fobra%2Ffilme%2F603%2Ftopicos%2Fnovo` when signed out; one topic with `replyCount: 3` → "3 respostas", `replyCount: 1` → "1 resposta"; `hasMore` → link `?pagina=2`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement components and pages.
- [ ] **Step 4:** `npm test && npm run lint && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(community): topics, replies, spoilers and reports UI`.

---

### Task 7: Admin screens

**Files:**
- Create: `src/lib/admin/domain.ts`, `src/lib/admin/actions.ts`, `src/app/admin/page.tsx`, `src/app/admin/dominios/page.tsx`
- Modify: `docs/setup-chaves.md` (section "8. Virar administrador": Supabase → Table Editor → `profiles` → your row → `is_admin` = `true` → Save)
- Test: `tests/admin/domain.test.ts`

**Interfaces:**
- Consumes: RPCs `resolve_report`, `add_blocked_domain`, `remove_blocked_domain` (Task 3); `getCurrentUser` (Task 4).
- Produces:
  - `normalizeDomain(input: string): string | null` — trims, lowercases, strips scheme, `www.`, path, port; returns `null` unless it matches `^[a-z0-9-]+(\.[a-z0-9-]+)+$`.
  - Server actions `resolveReport(formData)` (fields `reportId`, `action` ∈ `remover|ignorar|banir`), `addBlockedDomain(prev, formData)` (uses `normalizeDomain`; invalid → "Domínio inválido"), `removeBlockedDomain(formData)`; each `revalidatePath` its page.

Behavior:
- Both pages: not signed in → redirect `/entrar?next=/admin`; signed in but not admin → `notFound()`.
- `/admin`: open reports (oldest first), each with reason label, note, reporter `@user`, the reported text (title/body excerpt, 300 chars) with link to the topic, and buttons "Remover", "Ignorar", "Remover e banir autor" (the last with a confirm `<details>` step). Empty → "Nenhuma denúncia aberta".
- `/admin/dominios`: list with "Remover" per domain; add form "Adicionar domínio".

- [ ] **Step 1: Write the failing test** `normalizeDomain`: `' HTTPS://www.Pirata.example/filmes?x=1 '` → `'pirata.example'`; `'pirata.example:8080'` → `'pirata.example'`; `'sub.pirata.example'` → `'sub.pirata.example'`; `'not a domain'`, `''`, `'localhost'` → `null`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement helper, actions and pages; write docs section.
- [ ] **Step 4:** `npm test && npm run test:db && npm run lint && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(admin): reports queue and blocked domains`.

---

## Done when

- `npm test`, `npm run test:db`, `npm run lint`, `npm run build` pass locally and in CI on the PR.
- The migration workflow applies both new migrations on `main`.
- On the Vercel preview (after the user's Supabase Auth setup): sign in, choose a username, open a topic on `/obra/filme/603`, reply with a spoiler, report it from a second account, remove it as admin.
