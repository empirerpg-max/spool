# Lobby — Plano 6: Avisos e Início — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily check finds releases for works in people's lists and turns them into in-site alerts (bell + /avisos) and optional phone/browser notifications; the home page shows list news, films in theatres this week and community activity.

**Architecture:** Pure `detectEvents(before, after, today)` compares the cached work with a fresh fetch. A protected route `POST /api/tarefas/diaria` (Bearer `CRON_SECRET`) processes due works in batches, records events in Postgres (`record_event` fans out to notifications of list members, deduped by key) and sends pending Web Push messages; a scheduled GitHub Action calls it until nothing remains. VAPID keys are generated once and stored in a service-role-only table.

**Tech Stack:** Next.js route handlers/server actions · Postgres · `web-push` · service worker (`public/sw.js`) · GitHub Actions schedule · TMDB `/movie/now_playing`.

**Spec:** `docs/superpowers/specs/2026-11-16-lobby-avisos-inicio-design.md` (+ main spec goals 3 and 8).

## Global Constraints

- Event kinds and copy (pt-BR): `cinema` "{título} estreou nos cinemas"; `streaming` "{título} chegou na {serviço}"; `temporada_anunciada` "{título}: temporada {n} estreia em {dd/mm}"; `temporada_estreia` "{título}: temporada {n} estreou"; `livro_lancado` "{título} foi lançado".
- Who gets it: list members whose status ≠ `concluido`; for `temporada_*`, every list member.
- Streaming = availability types `subscription`, `free`, `ads` only.
- First check of a work (no previous snapshot) never emits `streaming` or `temporada_anunciada`.
- Dedupe key per event: `{kind}:{work_id}:{detail}` (detail = provider, season number, or date); unique in DB.
- Each work checked at most once per São Paulo day; batch ≤ 15 works and ≤ 40 s per call.
- Notifications older than 90 days are deleted by the job.
- `CRON_SECRET` compared in constant time; route answers 401 without it.

## Review Focus

1. A work enters a streaming service, leaves, and comes back → second arrival is a new alert only if it's a different day (key includes date). (Task 2)
2. A person removes the work from the list before the job runs → they get no alert. (Task 1)
3. A phone subscription that expired (push service answers 404/410) → removed, never blocks other sends. (Task 4)
4. The job runs twice the same day → no duplicate alerts, no extra TMDB calls. (Tasks 1, 3)
5. Someone without the secret calls the job route → 401, nothing happens. (Task 3)

---

### Task 1: Database — events, notifications, push

`supabase/migrations/20261120000000_alerts.sql`, `tests/db/alerts.test.ts`.

- `works.checked_on date` (last daily check, São Paulo date).
- `events(id bigserial pk, work_id uuid not null references works on delete cascade, kind text not null check (kind in ('cinema','streaming','temporada_anunciada','temporada_estreia','livro_lancado')), dedupe_key text not null unique, title text not null, body text, url text not null, created_at timestamptz default now())`.
- `notifications(id bigserial pk, user_id uuid not null references profiles on delete cascade, event_id bigint not null references events on delete cascade, read_at timestamptz, pushed_at timestamptz, created_at timestamptz default now(), unique (user_id, event_id))`; RLS: owner select; owner update of `read_at` only (column grant); no inserts by users.
- `push_subscriptions(id bigserial pk, user_id uuid not null default auth.uid() references profiles on delete cascade, endpoint text not null unique, p256dh text not null, auth text not null, created_at timestamptz default now())`; RLS owner select/insert/delete; column grants for insert `(endpoint, p256dh, auth)`.
- `push_keys(id boolean pk default true check (id), public_key text not null, private_key text not null)`; all privileges revoked from anon/authenticated (service role only).
- `record_event(p_work uuid, p_kind text, p_key text, p_title text, p_body text, p_url text) returns int` — security definer, executable by service_role only; inserts event `on conflict (dedupe_key) do nothing`; when inserted, inserts one notification per list member per the Global Constraints rule; returns number of notifications created (0 when duplicate).
- `mark_notifications_read() returns void` — sets `read_at = now()` on the caller's unread rows (authenticated).
- `unread_count() returns int` — caller's unread count.

Tests: fan-out respects status rule (concluido excluded except temporada_*); duplicate key → 0 and no new rows; non-list users get nothing; user sees only own notifications and can't insert; mark read; push_subscriptions private; push_keys unreadable by authenticated (`permission denied`); record_event not callable by authenticated.

- [ ] tests → FAIL → migration → PASS → commit `feat(db): events, notifications and push subscriptions`.

### Task 2: Event detection (pure)

`src/lib/alerts/detect.ts`, `tests/alerts/detect.test.ts`.

`type DetectedEvent = { kind; key; title; body: string | null; url: string }`; `detectEvents(input: { workId: string; path: string; before: NormalizedWork | null; after: NormalizedWork; today: string }): DetectedEvent[]`.
Rules: cinema when `after.theatricalDateBR === today`; streaming for each provider with a streaming type in `after` and not in `before` (only when `before` exists), key `streaming:{workId}:{provider}:{today}`; temporada_anunciada for each season whose `airDate` is set and `> today` and that was absent or had no/other date in `before` (only when `before` exists), key `temporada_anunciada:{workId}:{n}:{airDate}`; temporada_estreia when a season's `airDate === today`, key `temporada_estreia:{workId}:{n}`; livro_lancado when book `releaseDateBR === today`, key `livro_lancado:{workId}`. Titles per Global Constraints (dates dd/mm).

Tests: each rule positive/negative; first check emits only date-based events; two providers → two events; season 0 ignored (already excluded upstream); copy exact.

- [ ] tests → FAIL → implement → PASS → commit `feat(alerts): detect releases from catalog changes`.

### Task 3: Daily job route + GitHub schedule

`src/lib/alerts/job.ts` (`runDailyBatch(deps): Promise<{ processed: number; events: number; remaining: number }>`), `src/app/api/tarefas/diaria/route.ts`, `.github/workflows/daily.yml`, tests `tests/alerts/job.test.ts`, `tests/alerts/route.test.ts`.

- Due works: in some list, `checked_on` null or < today; ordered by `checked_on nulls first`; limit 15.
- Per work: cached = repo.find; fresh = fetcher (CatalogUnavailableError → skip, leave due); save; `detectEvents`; `record_event` for each; set `checked_on = today`.
- After batch: send pending pushes (Task 4 `sendPendingPushes`), delete notifications older than 90 days.
- Route: `POST` only; `Authorization: Bearer ${CRON_SECRET}` via `timingSafeEqual`; missing secret env → 503; returns JSON from `runDailyBatch`.
- Workflow: `schedule: cron '17 9 * * *'` (06:17 São Paulo) + `workflow_dispatch`; loop up to 40 calls while `remaining > 0`, `curl --fail` with secret `CRON_SECRET` and site URL `https://spool-eta-eight.vercel.app`.

Tests: job — due works processed, events recorded, checked_on set; source down → work stays due and counted in remaining; second run same day processes nothing. Route — 401 without/with wrong secret, 503 without env, 200 with secret (job mocked).

- [ ] tests → FAIL → implement → PASS → commit `feat(alerts): daily check route and schedule`.

### Task 4: Web Push

`src/lib/alerts/push.ts` (`getVapidKeys(client)`, `buildPushPayload(n)`, `sendPendingPushes(deps)`), `src/app/api/avisos/chave/route.ts` (GET public key), `src/lib/alerts/actions.ts` (`savePushSubscription(sub)`, `removePushSubscription(endpoint)`), `public/sw.js`, `src/components/alerts/EnablePush.tsx`, tests `tests/alerts/push.test.ts`, `tests/components/EnablePush.test.tsx`.

- `getVapidKeys`: read `push_keys`; if missing, `webpush.generateVAPIDKeys()` and insert (on conflict keep existing, re-read).
- `sendPendingPushes`: notifications with `pushed_at is null` joined to events and subscriptions; send `{ title, body, url }`; mark `pushed_at`; on 404/410 delete subscription; other errors logged; continue.
- `sw.js`: `push` → `showNotification(title, { body, data: { url }, icon: '/icons/icon-192.png' })`; `notificationclick` → focus/open url.
- `EnablePush`: shows "Ativar avisos no celular"; unsupported → "Seu navegador não aceita notificações"; iOS without standalone → "No iPhone, primeiro adicione o Lobby à tela de início (Compartilhar → Adicionar à Tela de Início)"; denied → "As notificações estão bloqueadas nas configurações do navegador"; on success "Avisos ativados neste aparelho" + "Desativar".

Tests: payload shape; send marks pushed and deletes 410 subscription while continuing others; EnablePush states (mock `navigator`).

- [ ] tests → FAIL → implement → PASS → commit `feat(alerts): web push notifications`.

### Task 5: Bell, /avisos and the new Início

`src/components/alerts/Bell.tsx` (server, count), `src/app/avisos/page.tsx`, `src/lib/alerts/queries.ts` (`listMyNotifications()`, `unreadCount()`), `src/lib/catalog/tmdb-client.ts` (+ `nowPlayingBR()` from `/movie/now_playing?region=BR&language=pt-BR`, top 12), `src/app/page.tsx`, components `src/components/home/*`; tests for Bell label ("3 avisos não lidos"), Avisos list empty state ("Nenhum aviso por enquanto. Adicione obras à sua lista para ser avisado."), home sections render with data and with empty data.

- Header: bell left of the user menu (signed in only), badge with count (9+ cap).
- /avisos: list (title, relative time, link), marks all as read on open, EnablePush at top.
- Início signed in: "Novidades da sua lista" (5 latest notifications), "Nos cinemas esta semana" (poster row, film color), "Conversas nas suas comunidades" (6 latest topics from works in the list). Signed out: current hero + "Nos cinemas esta semana".

- [ ] tests → FAIL → implement → PASS → commit `feat: alerts bell, alerts page and new home`.

### Task 6: Setup docs

`docs/setup-chaves.md` section 9 "Avisos": create `CRON_SECRET` (use a password generator, 32+ chars) in Vercel (Secret, Production) and GitHub Secrets; Redeploy; run the "Avisos diários" workflow once by hand.

- [ ] commit `docs: daily alerts setup`.
