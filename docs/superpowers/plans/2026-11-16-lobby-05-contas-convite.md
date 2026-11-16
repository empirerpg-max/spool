# Lobby — Plano 5: Contas com e-mail e senha, só com convite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace magic-link/Google login with e-mail + password accounts that can only be created with a single-use invite code (first account excepted, becomes admin), collecting name, surname, birth date (16+) and terms acceptance.

**Architecture:** Supabase Auth `signUp` / `signInWithPassword`. The real gate lives in Postgres: the `auth.users` insert trigger validates the invite, age and terms from the sign-up metadata, consumes the invite and fills the profile, so the rules hold even for direct API calls. Server actions pre-check with a public `invite_is_valid` RPC only to show friendly messages. Admin RPCs create invites; password resets use the service-role Admin API on the server.

**Tech Stack:** Next.js 15 server actions · `@supabase/ssr` · Postgres triggers/RPCs · zod · Vitest + Postgres harness.

**Spec:** `docs/superpowers/specs/2026-11-16-lobby-contas-convite-design.md`

## Global Constraints

- Minimum age 16 (on the São Paulo calendar date). Max age 120.
- Password: ≥ 8 chars, at least one letter and one digit. Confirm must match.
- Invite code alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, length 8, stored uppercase; input is trimmed/uppercased.
- Terms version `2026-11-16`.
- Personal data (first/last name, birth date, terms) never readable by other users or anon.
- All copy pt-BR, plain language.

## Review Focus

1. Someone calls Supabase's sign-up API directly (bypassing the site) without a code, with a used code, or with a 15-year-old birth date → the account is not created. (Task 1)
2. Two people use the same code at the same moment → only one account is created. (Task 1)
3. A signed-in user reads `profiles` for someone else → sees no name/birth date. (Task 1)
4. Sign-up while Supabase still requires e-mail confirmation → the page says "Confira seu e-mail para ativar a conta" instead of failing silently. (Task 2)
5. Wrong password, unknown e-mail → one neutral message ("E-mail ou senha incorretos"), no hint which one. (Task 2)

---

### Task 1: Database — invites, profile fields, sign-up gate

**Files:** Create `supabase/migrations/20261119000000_invites.sql`; Test `tests/db/invites.test.ts`; Modify `tests/db/harness.ts` (`createUser(email, meta?)` passes `raw_user_meta_data`).

SQL:
- `profiles` + `first_name text`, `last_name text`, `birth_date date`, `terms_version text`, `terms_accepted_at timestamptz`. Column privileges: `revoke select on profiles from anon, authenticated; grant select (id, username, display_name, is_admin, banned_at, created_at) on profiles to anon, authenticated;` plus `my_profile()` security definer returning own full row (first/last name, birth date).
- `invites(code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'), note text check (char_length(note) <= 100), created_by uuid references profiles, created_at timestamptz default now(), used_by uuid references profiles, used_at timestamptz)`; RLS: select for admins only; no direct writes.
- `invite_is_valid(p_code text) returns boolean` — security definer; executable by anon and authenticated; true when an unused invite with `upper(trim(p_code))` exists, or when there are no profiles yet.
- `create_invite(p_note text) returns text` — admin only (`'forbidden'`), generates a random 8-char code from the alphabet, retries on collision.
- `handle_new_user()` rewritten (security definer): reads `new.raw_user_meta_data` keys `first_name`, `last_name`, `birth_date`, `terms_version`, `invite_code`. If no profiles exist → bootstrap: insert profile with `is_admin = true` (invite not required, other fields still required). Otherwise: require all fields (`'invalid_signup'`), age ≥ 16 by `birth_date <= (now() at time zone 'America/Sao_Paulo')::date - interval '16 years'` (`'too_young'`), terms_version = '2026-11-16' (`'terms_required'`), and consume the invite with `update invites set used_by = new.id, used_at = now() where code = upper(trim(code_in)) and used_at is null` — zero rows → `'invalid_invite'`. Insert profile with the personal fields and `terms_accepted_at = now()`. Accounts created by an admin in the Supabase dashboard (no metadata) after bootstrap are rejected too, except when `raw_app_meta_data->>'provider' = 'email'` and `raw_user_meta_data->>'created_by_admin' = 'true'` — **not supported**; dashboard creation is documented as unavailable.

Tests: bootstrap first user without invite → profile is admin; second user without invite → `invalid_invite`; with valid code → created, invite marked used by that user; reusing code → `invalid_invite`; code in lowercase with spaces works; 15-year-old → `too_young`; exactly 16 today → ok; wrong terms version → `terms_required`; missing first_name → `invalid_signup`; `invite_is_valid` true/false for anon; `create_invite` admin ok / non-admin `forbidden` and code matches regex; another user selecting `first_name` of a profile → `permission denied`; `my_profile()` returns own name; anon can still read `username`.
Concurrency test: two transactions consuming the same code — the second blocks on the row lock and gets `invalid_invite` after the first commits (use two pooled clients).

- [ ] write tests → FAIL → migration → PASS → commit `feat(db): invite-only sign-up with age and terms checks`.

### Task 2: Sign-up and sign-in screens

**Files:** Create `src/lib/auth/signup-schema.ts`, `src/lib/auth/actions.ts` (`signUp`, `signIn`), `src/app/criar-conta/page.tsx` + `SignUpForm.tsx`; Modify `src/app/entrar/page.tsx`, `src/app/entrar/LoginForm.tsx` (email + password, links "Criar conta" and "Esqueci minha senha"), `src/app/auth/callback/route.ts` (kept for future e-mail links), `src/lib/community/errors.ts` (map `invalid_invite`, `too_young`, `terms_required`, `invalid_signup`), `.env.example` (drop Google flag); Test `tests/auth/signup-schema.test.ts`, `tests/components/LoginForm.test.tsx` (rewrite), `tests/components/SignUpForm.test.tsx`.

**Interfaces:** `signUpSchema` (zod: firstName/lastName trimmed 1–50; birthDate ISO date with age 16–120 relative to an injectable `today` — export `ageOn(birth: string, today: string): number`; email; password rules; confirmPassword equal (message "As senhas não são iguais"); acceptTerms must be `'on'` ("Você precisa aceitar os Termos de Uso"); inviteCode optional string normalized uppercase). `signUp(prev, formData)` → validates, calls `invite_is_valid` (message "Convite inválido ou já usado"), `supabase.auth.signUp({ email, password, options: { data: { first_name, last_name, birth_date, terms_version: '2026-11-16', invite_code } } })`; maps "User already registered" → "Já existe uma conta com esse e-mail"; DB trigger errors (Supabase returns "Database error saving new user") → "Não foi possível criar a conta. Confira o convite e a data de nascimento."; on session → redirect `/bem-vindo`; without session → `{ needsConfirmation: true }`. `signIn(prev, formData)` → `signInWithPassword`; any auth error → "E-mail ou senha incorretos"; success → redirect `safeNextPath(next)` (or `/bem-vindo` when no username).

UI: `/entrar` (Entrar no Lobby; e-mail, senha, Entrar; "Ainda não tem conta? Criar conta"; "Esqueci minha senha" reveals "Peça para a equipe do Lobby redefinir sua senha."). `/criar-conta` fields in spec order, terms checkbox with links to `/termos` and `/privacidade`, invite field labelled "Código de convite", button "Criar conta"; field errors under each field.

Tests: schema — valid input; 15 years and 364 days → "Você precisa ter pelo menos 16 anos"; exactly 16 → ok; password "abcdefgh" (no digit) and "1234567" → errors; mismatch; terms missing; invite " ab3d efg7 " → "AB3DEFG7". `ageOn('2010-11-17','2026-11-16') === 15`, `ageOn('2010-11-16','2026-11-16') === 16`. LoginForm renders email/password fields and "Criar conta" link; no Google button. SignUpForm renders all 8 fields with labels and links to `/termos` and `/privacidade`.

- [ ] tests → FAIL → implement → all checks PASS → commit `feat(auth): e-mail and password accounts with invite-only sign-up`.

### Task 3: Terms of Use and Privacy Policy

**Files:** Create `src/app/termos/page.tsx`, `src/app/privacidade/page.tsx`; Modify `src/components/Footer.tsx` (links); Test `tests/components/Footer.test.tsx` (links present).

Content (pt-BR, plain language, version 16/11/2026): who we are; who can use (16+, invite); account rules; community rules (respect, spoiler marking, no piracy links, no hate/harassment, no spam); moderation (removal, ban, reports); user content license (user keeps rights, grants Lobby a license to display); third-party data (TMDB, JustWatch, Open Library, Google Books) and external store/streaming links; no warranty; changes to terms; contact. Privacy: data collected (name, surname, birth date, e-mail, list, ratings, reviews, posts), why (account, age check, community), what is public (@, published posts/reviews) vs private (name, birth date, e-mail, private list), processors (Supabase, Vercel), retention, LGPD rights and how to ask, cookies (session only). Both pages show "Este texto é um ponto de partida e será revisado juridicamente." only in the repo docs, not on the page.

- [ ] Footer test (links "Termos de Uso" → `/termos`, "Privacidade" → `/privacidade`) → FAIL → implement → PASS → commit `feat: terms of use and privacy policy`.

### Task 4: Admin — invites and password reset

**Files:** Create `src/app/admin/convites/page.tsx` + `NewInviteForm.tsx`, `src/app/admin/usuarios/page.tsx` + `ResetPasswordForm.tsx`, `src/lib/admin/accounts.ts` (server actions `createInvite`, `resetPassword`); Modify admin nav (Denúncias · Convites · Usuários · Domínios bloqueados); Test `tests/admin/accounts.test.ts` (`temporaryPassword()` format), `tests/components/NewInviteForm.test.tsx`.

- `createInvite(prev, formData)` → RPC `create_invite(note)` → returns `{ code }` shown big with a "Copiar" button.
- Convites page lists invites (code, note, created, status "Disponível" / "Usado por @x em dd/mm").
- `resetPassword(prev, formData)` (admin only, re-checks `getCurrentUser().isAdmin`) → finds the user by e-mail with the service client (`auth.admin.listUsers` paged search) → `auth.admin.updateUserById(id, { password: temporaryPassword() })` → shows the temporary password once, with "Passe esta senha para a pessoa e peça para trocá-la".
- `temporaryPassword()` → 12 chars from the invite alphabet + lowercase + digits, always containing a letter and a digit.
- Also add "Trocar senha" for the signed-in user in `/minha-conta` (new page: shows name and e-mail; form new password + confirm → `supabase.auth.updateUser({ password })`).

- [ ] tests → FAIL → implement → all checks PASS → commit `feat(admin): invites, password reset and my account`.

### Task 5: Setup docs

Modify `docs/setup-chaves.md`: replace section 7 (Google) with "7. Contas": Supabase → Authentication → Sign In / Providers → Email: **desligar "Confirm email"**; Site URL/Redirect URLs stay; "Criar a sua conta (a primeira, sem convite, vira administradora)"; remove section 8's manual is_admin step (now automatic), keep it as fallback.

- [ ] commit `docs: account setup steps`.
