# Lobby — Plano 11: Atividade da lista na timeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Followers see "Micael viu Duna ★★★★½" in the timeline when Micael allowed it; marking Visto/Lido offers "Contar para o clube?".

**Architecture:** `profile_details` gets `share_activity boolean null` (null = never answered → off) and `share_ratings boolean not null default false`. `list_items` gets `status_changed_at timestamptz` maintained by a trigger (insert or status change). The existing `timeline()` gains an item type `'list'` (item_id = list item id) filtered in SQL by follow + `share_activity` + not imported + block/mute; a new `timeline_list_details(ids uuid[])` returns status and (only when `share_ratings`) rating. UI adds a TimelineItem variant, a one-time banner, two toggles, the `/bem-vindo` checkbox and the "Contar para o clube?" prompt.

**Spec:** `docs/superpowers/specs/2026-11-18-lobby-atividade-na-timeline-design.md`

## Global Constraints
- Copy (pt-BR exact): toggles "Mostrar minha atividade para quem me segue" (hint "Quem te segue vê quando você marca algo como Quero ver, Vendo ou Visto.") and "Mostrar minhas notas junto"; banner "Mostrar sua atividade para quem te segue? Assim seus amigos veem o que você viu e quer ver." buttons "Sim, mostrar" / "Agora não"; prompt "Contar para o clube?" button "Publicar sobre esta obra".
- Verbs by status × kind: quero → "quer ver"/"quer ler"; andamento → "está vendo"/"está lendo"; concluido → "viu"/"leu" (books use ler forms; films and series use ver forms).
- "Agora não" sets `share_activity = false` (never asked again). New members: `/bem-vindo` checkbox checked by default; saving the username saves the choice.
- Imported list items never appear (same import link as `lobby_popular`: `import_items` state `'importado'` + `imports.user_id`).
- Ratings appear only when `share_ratings` is true AND the item has a rating. Reviews never appear through this path.

## Review Focus
1. Someone who never answered (null) → nothing of theirs appears. (Task 1)
2. Ratings hidden when `share_ratings` is false even if the API is called directly. (Task 1)
3. Blocked either way / muted → no items. (Task 1)
4. Importing 500 items → none in followers' timelines. (Task 1)
5. Changing only rating or review (not status) does not create a new timeline item. (Task 1)

### Task 1: Database
`supabase/migrations/20261128000000_list_activity.sql`, `tests/db/list-activity.test.ts`.
- Columns above; backfill `status_changed_at = coalesce(updated_at, created_at)`; trigger `before insert or update of status on list_items` sets `status_changed_at = now()` when inserting or when status changes.
- Column grants: authenticated may update own `share_activity`, `share_ratings` in `profile_details` (mirror existing bio/list_public grants and banned trigger).
- `timeline(...)` (keep signature) adds `'list'` rows: `item_id = list_items.id`, `created_at = status_changed_at`, `actor_id = list_items.user_id`, `work_id`; only followees with `share_activity is true`, excluding imported, muted, blocked either way; same cursor/order rules.
- `timeline_list_details(p_ids uuid[]) returns table(id uuid, status text, rating numeric)` security definer: returns rows only for items the caller could see in the timeline (same conditions), rating null unless `share_ratings`.
- Tests: Review Focus 1–5; ordering mixed with posts; cursor still works; anon denied.
- [ ] RED → GREEN → commit `feat(db): list activity in the timeline`.

### Task 2: UI
- `src/lib/social/timeline.ts`: hydrate `'list'` items via `timeline_list_details` + works; `src/components/social/TimelineItem.tsx`: variant "(avatar) @nome {verbo} [capa] Título ★★★★½ · tempo", links to profile and work. Pure `activityVerb(status, kind)` with tests.
- `src/app/minha-conta` Perfil section: two toggles (second disabled when first off) saved with the profile form (extend `profile-schema.ts` / `updateProfile`).
- `src/app/bem-vindo`: checkbox checked by default; `actions.ts` saves it.
- Banner component on `/` (signed-in) and `/timeline` when own `share_activity` is null; actions `setShareActivity(true|false)`.
- "Contar para o clube?" in `src/components/list/ListControls.tsx` after status becomes `concluido` (client state after the action succeeds), link `/publicar?obra=<workId>`; hidden when banned or no username.
- Tests: verb table; TimelineItem list variant with/without stars; banner buttons call actions; toggles; prompt appears only after marking Visto/Lido.
- [ ] `npm test`, DB tests, typecheck, lint, build → PASS; commit `feat: list activity in the timeline and "Contar para o clube?"`.
