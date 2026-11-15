# Lobby — Plano 3: Lista pessoal, nota, resenha e importação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each signed-in person keeps one private list of movies, series and books with a state, an optional 0.5–5 star rating and a review that they can keep private or publish as a topic in the work's community, and can bring their history in from Letterboxd or Goodreads CSV exports.

**Architecture:** A `list_items` table (one row per user × work) with RLS that keeps every list private; publishing a review goes through `security definer` RPCs that create/remove a community topic, so the topic rules from plan 2 (ban, blocked links, rate limit) still apply. CSV imports are parsed on the server into `import_items` rows and matched to works in small batches that the browser keeps requesting until done, which keeps each request well under Vercel's time limit.

**Tech Stack:** Next.js 15 server actions · Supabase Postgres (RLS, triggers, RPCs) · `papaparse` (CSV) · TMDB `/search/movie` · Open Library `/isbn/{isbn}.json` and `/search.json` · Vitest + Postgres harness from plan 2.

**Spec:** `docs/superpowers/specs/2026-11-14-lobby-design.md` (goals 2, 6, 9, 10; screen 5). Builds on plans 1–2.

## Global Constraints

- States: `quero` / `andamento` / `concluido`. Labels — movie and series: "Quero ver", "Vendo", "Visto"; book: "Quero ler", "Lendo", "Lido".
- Rating: 0.5 to 5 in steps of 0.5, only when the state is `concluido`. Review text up to 10000 characters, also only when `concluido`.
- The list is private: nobody but the owner can read or change it.
- The person decides whether a review is published as a topic; they can publish a saved review later or unpublish (the topic leaves the community, the review stays saved). Published review topic title: `Resenha de @<username>`.
- Imported reviews always arrive private.
- Membership in a community = having the work in one's list (used by plan 4's home feed; no extra table).
- Only signed-in users with a username use the list; signed-out users see "Entre para salvar na sua lista".
- If the work page has `id === null` (cache write failed), the list controls are hidden with "Lista indisponível no momento".
- All copy in pt-BR.

## Review Focus

1. A person edits or deletes a review that is already published → the community topic follows (body updated; deleting the review or the list item unpublishes it). (Task 1)
2. A banned person, or a review containing a blocked domain, tries to publish → refused with the plan-2 messages; the private review is still saved. (Task 1, Task 2)
3. Letterboxd export with the same film in several files (watchlist + watched + ratings + reviews) → one list item with the most advanced state, the rating and the review. (Task 4)
4. Goodreads ISBN cells in the `="9780..."` form, empty ISBNs, rating `0` (meaning unrated) → parsed correctly; books without ISBN still matched by title + author. (Tasks 4, 5)
5. A CSV with 1000+ rows → processed in batches without timeouts; closing the page and coming back resumes; a row that fails to match never blocks the rest. (Task 6)

---

## File Structure

```
supabase/migrations/20261117000000_lists.sql      list_items, imports, import_items, review RPCs and triggers
tests/db/lists.test.ts
src/lib/list/types.ts                             ListStatus, ListItem, statusLabel()
src/lib/list/schemas.ts                           statusSchema, reviewSchema
src/lib/list/queries.ts                           getListItem, listMyItems
src/lib/list/actions.ts                           setStatus, saveReview, removeFromList
src/components/list/ListControls.tsx              work page panel
src/components/list/StarRating.tsx
src/app/minha-lista/page.tsx
src/lib/import/types.ts                           ImportRow
src/lib/import/letterboxd.ts                      parseLetterboxd(files)
src/lib/import/goodreads.ts                       parseGoodreads(csv)
src/lib/import/match.ts                           matchRow()
src/lib/import/process.ts                         processBatch()
src/lib/import/actions.ts                         createImport, processImportBatch
src/app/minha-lista/importar/page.tsx + ImportUploader.tsx + ImportProgress.tsx
src/lib/catalog/tmdb-client.ts                    + searchTmdbMovie(title, year)
src/lib/catalog/books-client.ts                   + findBookByIsbn(isbn), findBookByTitle(title, author)
tests/import/*.test.ts, tests/fixtures/letterboxd-*.csv, goodreads-library.csv
```

---

### Task 1: Lists migration — list items, review publishing, imports

**Files:**
- Create: `supabase/migrations/20261117000000_lists.sql`
- Test: `tests/db/lists.test.ts`

**Interfaces:**
- Consumes: `works`, `profiles`, `topics` and its triggers (plans 1–2).
- Produces (SQL):
  - `list_items(user_id uuid not null default auth.uid() references profiles on delete cascade, work_id uuid not null references works on delete cascade, status text not null check (status in ('quero','andamento','concluido')), rating numeric(2,1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)), review text check (char_length(review) <= 10000), review_has_spoiler boolean not null default false, finished_on date, review_topic_id uuid references topics on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (user_id, work_id), check (status = 'concluido' or (rating is null and review is null)))`.
  - RLS: select/insert/update/delete for `authenticated` only where `user_id = auth.uid()`. Column grants: insert/update only `(work_id, status, rating, review, review_has_spoiler, finished_on)`; `review_topic_id`, `user_id` set by DB.
  - `publish_review(p_work_id uuid) returns uuid` — `security definer`; requires own `list_items` row with non-empty `review`; if `review_topic_id` points to a live topic, updates its body/spoiler and returns it; otherwise inserts a topic (`title = 'Resenha de @' || username`, `body = review`, `has_spoiler = review_has_spoiler`, `author_id = auth.uid()`) — inserting through the normal table so plan-2 triggers (ban, username, blocked links, rate limit) run — and stores its id. Raises `'no_review'` when there is nothing to publish.
  - `unpublish_review(p_work_id uuid) returns void` — sets the topic's `deleted_at = now()` and `review_topic_id = null`.
  - Trigger after update of `review, review_has_spoiler` on `list_items`: when `review_topic_id` is set, update that topic's `body`/`has_spoiler` (or unpublish when the review became empty).
  - Trigger before delete on `list_items`: unpublish its review topic.
  - `updated_at` maintained by a before-update trigger.
  - `imports(id uuid pk default gen_random_uuid(), user_id uuid not null default auth.uid() references profiles on delete cascade, source text not null check (source in ('letterboxd','goodreads')), created_at timestamptz not null default now())` and `import_items(id uuid pk, import_id uuid not null references imports on delete cascade, position int not null, row jsonb not null, state text not null default 'pendente' check (state in ('pendente','importado','nao_encontrado')), work_id uuid references works, unique (import_id, position))`; index on `(import_id, state, position)`. RLS: owner of the parent import can select/insert/update; column grants keep `user_id` DB-owned.

- [ ] **Step 1: Write the failing tests** (`ana` and `bia` with usernames, work W):
  - `add, change and remove own list item` — insert `quero` → update to `concluido` with rating 4.5 → delete; each visible only to ana.
  - `list is private` — bia `select` returns 0 rows of ana; bia update/delete of ana's row affects 0 rows; anon select rejects (`/permission denied/`) or returns none.
  - `rating rules` — 4.3 and 0 and 5.5 reject (`/check constraint/`); rating with status `quero` rejects; review with status `andamento` rejects.
  - `cannot set review_topic_id directly` — insert/update of that column rejects `/permission denied/`.
  - `publish creates a community topic` — ana saves review "Obra-prima" with spoiler → `publish_review(W)` returns id; anon sees topic `title 'Resenha de @ana'`, `body 'Obra-prima'`, `has_spoiler true`; list item has `review_topic_id`.
  - `publishing twice updates the same topic` — second call returns the same id.
  - `editing a published review updates the topic` — update review → topic body follows.
  - `clearing the review unpublishes` — set review null → topic hidden from anon, `review_topic_id` null.
  - `unpublish keeps the review` — `unpublish_review(W)` → topic hidden, list item still has review.
  - `deleting the list item unpublishes` — delete row → topic hidden.
  - `publish respects community rules` — banned ana → `'banned'`; review with blocked domain → `'blocked_link'`; ana without review → `'no_review'`; in all cases the list item keeps its review.
  - `imports are private` — ana creates import + items; bia sees none and can't insert items into ana's import (`/row-level security/`).
- [ ] **Step 2:** `npm run test:db` → FAIL.
- [ ] **Step 3:** Write the migration.
- [ ] **Step 4:** `npm run test:db` → PASS.
- [ ] **Step 5:** Commit `feat(db): private lists, ratings, reviews and imports`.

---

### Task 2: List data layer

**Files:**
- Create: `src/lib/list/types.ts`, `src/lib/list/schemas.ts`, `src/lib/list/queries.ts`, `src/lib/list/actions.ts`
- Test: `tests/list/types.test.ts`, `tests/list/schemas.test.ts`

**Interfaces:**
- Consumes: `createSessionClient`, `getCurrentUser`, `dbErrorMessage` (plan 2; add `no_review` → "Escreva a resenha antes de publicar.").
- Produces:
  - `type ListStatus = 'quero' | 'andamento' | 'concluido'`; `LIST_STATUSES`.
  - `statusLabel(kind: WorkKind, status: ListStatus): string`.
  - `type ListItem = { workId: string; status: ListStatus; rating: number | null; review: string | null; reviewHasSpoiler: boolean; finishedOn: string | null; published: boolean; updatedAt: string }`.
  - `type ListEntry = ListItem & { work: { kind: WorkKind; externalId: string; title: string; posterUrl: string | null; year: number | null } }`.
  - `statusSchema` (enum), `reviewSchema` (zod: `rating` optional, from string, must be 0.5–5 step 0.5 — message "Nota inválida"; `review` trimmed, ≤ 10000, blank → null; `reviewHasSpoiler` checkbox; `finishedOn` optional ISO date not in the future; `publish` checkbox).
  - `getListItem(workId: string): Promise<ListItem | null>`.
  - `listMyItems(filter: { kind?: WorkKind; status?: ListStatus }): Promise<ListEntry[]>` — ordered by `updated_at desc`, up to 500.
  - Server actions: `setStatus(workId, workPath, status)` (upsert; moving away from `concluido` clears rating/review after unpublishing — the UI confirms first), `saveReview(workId, workPath, prev, formData)` (sets status `concluido`, saves rating/review; then if `publish` checked calls `publish_review`, else if it was published calls `unpublish_review`; returns `{ ok }` or `{ error }` — a publish failure still keeps the saved review and says so: "Resenha salva, mas não publicada: <motivo>"), `removeFromList(workId, workPath)`.

- [ ] **Step 1: Write the failing tests:** `statusLabel('book','andamento') === 'Lendo'`, `statusLabel('series','concluido') === 'Visto'`, `statusLabel('movie','quero') === 'Quero ver'`; `reviewSchema`: `'4.5'` → 4.5, `''` → undefined, `'4.3'`/`'0'`/`'6'` → "Nota inválida", review `'  '` → null, `finishedOn` tomorrow fails, `publish: 'on'` → true.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(list): types, validation, queries and actions`.

---

### Task 3: List UI — work page panel and "Minha lista"

**Files:**
- Create: `src/components/list/ListControls.tsx`, `src/components/list/StarRating.tsx`, `src/app/minha-lista/page.tsx`
- Modify: `src/app/obra/[kind]/[externalId]/page.tsx` (panel under the title block), `src/components/UserMenu.tsx` (link "Minha lista")
- Test: `tests/components/ListControls.test.tsx`, `tests/components/StarRating.test.tsx`

**Interfaces:**
- Consumes: Task 2.
- Produces: `<ListControls kind workId workPath item signedIn hasUsername />`, `<StarRating name defaultValue? />` (10 radio inputs 0.5…5 rendered as half stars, plus "Sem nota"; accessible labels "4,5 estrelas").

Behavior:
- `workId === null` → "Lista indisponível no momento". Signed out → link "Entre para salvar na sua lista" (`/entrar?next=<workPath>`). No username → link to `/bem-vindo`.
- Three state buttons with the kind's labels; current one highlighted (`aria-pressed`). "Remover da lista" when present.
- When `concluido`: form with StarRating, "Quando terminou" date, review textarea, checkbox "Contém spoiler", checkbox "Publicar na comunidade" (checked when already published) with helper "Se marcado, sua resenha vira um tópico na comunidade desta obra.", button "Salvar"; when published, link "Ver na comunidade".
- `/minha-lista`: requires sign-in; filter links Tipo (Tudo/Filmes/Séries/Livros) and Estado (Todos/Quero/Em andamento/Concluídos) via query string; grid of posters with title, year, state label, stars; empty → "Sua lista está vazia. Busque um filme, série ou livro para começar." with link to search; link "Importar do Letterboxd ou Goodreads".

- [ ] **Step 1: Write the failing tests:**
  - `ListControls`: null workId → unavailable text; signed out → sign-in link with `next`; book with `item = null` → buttons "Quero ler", "Lendo", "Lido", none pressed; movie item `andamento` → "Vendo" has `aria-pressed="true"`; item `concluido` published → "Publicar na comunidade" checked and "Ver na comunidade" link present; `quero` → no review form.
  - `StarRating`: renders 10 radios, defaultValue 3.5 checks the radio labelled "3,5 estrelas"; "Sem nota" option present.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement components and pages.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(list): list panel on work pages and Minha lista`.

---

### Task 4: CSV parsers — Letterboxd and Goodreads

**Files:**
- Create: `src/lib/import/types.ts`, `src/lib/import/letterboxd.ts`, `src/lib/import/goodreads.ts`, fixtures `tests/fixtures/letterboxd-watchlist.csv`, `letterboxd-watched.csv`, `letterboxd-ratings.csv`, `letterboxd-reviews.csv`, `goodreads-library.csv`
- Test: `tests/import/letterboxd.test.ts`, `tests/import/goodreads.test.ts`

**Interfaces:**
- Produces:
  - `type ImportRow = { kind: 'movie' | 'book'; title: string; year: number | null; author: string | null; isbn: string | null; status: ListStatus; rating: number | null; review: string | null; finishedOn: string | null }`.
  - `parseLetterboxd(files: Array<{ name: string; text: string }>): ImportRow[]` — recognizes `watchlist.csv` (status `quero`), `watched.csv` (`concluido`), `ratings.csv` (`concluido` + `Rating`), `reviews.csv` and `diary.csv` (`concluido` + `Review`/`Rating` + `Watched Date`); merges rows by `Letterboxd URI` (fallback `Name|Year`), keeping the most advanced status, latest non-empty rating, review and watched date. Columns: `Date, Name, Year, Letterboxd URI, Rating, Review, Watched Date`. Unknown file names ignored.
  - `parseGoodreads(text: string): ImportRow[]` — columns `Title, Author, ISBN, ISBN13, My Rating, Exclusive Shelf, My Review, Date Read, Year Published`; ISBN cells stripped of `="` and `"`; `My Rating` 0 → null; shelf `read` → `concluido`, `currently-reading` → `andamento`, anything else → `quero`; `Date Read` `2023/05/14` → `2023-05-14`; review only kept when `concluido`; HTML `<br/>` in reviews → newlines.
  - Both throw `ImportFormatError('Arquivo não reconhecido')` when required headers are missing.
  - `MAX_IMPORT_ROWS = 5000` — more rows → `ImportFormatError('Arquivo grande demais (máximo 5000 itens)')`.

- [ ] **Step 1: Write the failing tests:** Letterboxd — same film in watchlist and ratings → one row `concluido`, rating 4; reviews.csv text kept with `finishedOn`; film only in watchlist → `quero`; a file named `profile.csv` ignored; missing headers → `ImportFormatError`. Goodreads — `="9788535911664"` → `9788535911664` (prefers ISBN13); empty ISBN → null; rating 0 → null; shelves map to the three states; `Date Read` converted; `My Review` dropped for `to-read`; 5001 rows → size error.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement with `papaparse` (`header: true`, `skipEmptyLines: true`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(import): Letterboxd and Goodreads CSV parsers`.

---

### Task 5: Matching rows to works

**Files:**
- Create: `src/lib/import/match.ts`
- Modify: `src/lib/catalog/tmdb-client.ts` (+ `searchTmdbMovie(title: string, year: number | null, fetchImpl?): Promise<SearchHit[]>` via `/search/movie?query=&year=&language=pt-BR`), `src/lib/catalog/books-client.ts` (+ `findBookByIsbn(isbn, fetchImpl?): Promise<string | null>` returning the OL work id from `/isbn/{isbn}.json` → `works[0].key`; `findBookByTitle(title, author, fetchImpl?): Promise<string | null>` via `/search.json?title=&author=&limit=1`)
- Test: `tests/import/match.test.ts`, additions to `tests/catalog/tmdb-client.test.ts` and `tests/catalog/books-client.test.ts`

**Interfaces:**
- Produces: `matchRow(row: ImportRow, deps?): Promise<{ kind: WorkKind; externalId: string } | null>` — movies: `searchTmdbMovie(title, year)`, take the first hit whose year equals `row.year` (or the first hit when `year` is null); none → retry once without year; still none → null. Books: ISBN → `findBookByIsbn`; else/none → `findBookByTitle`; none → null. `CatalogUnavailableError` propagates (the batch retries later); `WorkNotFoundError` → null.

- [ ] **Step 1: Write the failing tests:** movie with year matches hit of same year, not the first different-year hit; no hit with year → second call without year; book with ISBN uses `/isbn/`; ISBN 404 falls back to title search; nothing found → null; TMDB down → rejects `CatalogUnavailableError`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(import): match imported rows to catalog works`.

---

### Task 6: Import flow — upload, batches, progress

**Files:**
- Create: `src/lib/import/process.ts`, `src/lib/import/actions.ts`, `src/app/minha-lista/importar/page.tsx`, `src/app/minha-lista/importar/ImportUploader.tsx`, `src/app/minha-lista/importar/ImportProgress.tsx`
- Test: `tests/import/process.test.ts`

**Interfaces:**
- Consumes: parsers (Task 4), `matchRow` (Task 5), `getOrFetchWork` (plan 1), session client.
- Produces:
  - `processBatch(items: Array<{ id: string; row: ImportRow }>, deps: { match: typeof matchRow; getWork: (kind, externalId) => Promise<{ id: string | null }>; saveListItem: (workId: string, row: ImportRow) => Promise<void>; markItem: (id: string, state: 'importado' | 'nao_encontrado', workId: string | null) => Promise<void> }): Promise<{ imported: number; notFound: number; retryLater: number }>` — per item: match → work (null id or no match → `nao_encontrado`) → save list item (never overwrites an existing item's more advanced status or existing review; fills rating/review only if empty; review always private) → `importado`. `CatalogUnavailableError` → leave `pendente`, count `retryLater`, stop the batch.
  - `BATCH_SIZE = 10`.
  - Server actions: `createImport(source: 'letterboxd' | 'goodreads', formData)` (files from `<input type="file" multiple>`, each ≤ 5 MB; parse; insert `imports` + `import_items` in chunks of 500; redirect `/minha-lista/importar?id=<id>`), `processImportBatch(importId): Promise<{ pending: number; imported: number; notFound: number }>`.
  - Page segment config `export const maxDuration = 60`.

Behavior:
- `/minha-lista/importar` (signed in with username): two cards, "Letterboxd" (instructions: Letterboxd → Settings → Import & Export → Export your data; send the CSV files from the zip — `watched.csv`, `ratings.csv`, `reviews.csv`, `watchlist.csv`) and "Goodreads" (My Books → Import and export → Export Library; send the CSV).
- With `?id=`: `ImportProgress` (client) calls `processImportBatch` repeatedly while `pending > 0`, showing "Importando… X de Y"; when done: "Pronto! X itens importados." and, if any, the list "Não encontramos estes itens" (title, year/author) each with a link to `/busca?q=<title>`. Reopening the page resumes pending items.

- [ ] **Step 1: Write the failing tests** (`processBatch` with fakes): matched row → `saveListItem` + `importado`; unmatched → `nao_encontrado`, no save; `getWork` returning `id: null` → `nao_encontrado`; second item throws `CatalogUnavailableError` → first `importado`, second untouched, result `{ imported: 1, retryLater: 1 }`; unexpected error on one item → that item `nao_encontrado`, others continue.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `process.ts`, actions (the real `saveListItem` merges with any existing row as described) and pages.
- [ ] **Step 4:** `npm test && npm run test:db && npm run typecheck && npm run lint && npm run build` → PASS.
- [ ] **Step 5:** Commit `feat(import): upload, batched matching and progress`.

---

## Done when

- All four check commands pass locally and in CI; migration applied on `main`.
- On the preview: add a work as "Quero ver", mark "Visto" with 4,5 estrelas and a review, publish it (topic appears in the community), unpublish it, see it in "Minha lista", import a small Letterboxd and Goodreads export.
