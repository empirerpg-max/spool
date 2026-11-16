# Lobby — Plano 4: Identidade visual "Saguão" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Lobby its "Saguão" identity — dark plum theme, one color per kind of work, community-first work page with a backdrop hero — without changing any business behavior.

**Architecture:** Design tokens live in `src/app/globals.css` as a Tailwind v4 `@theme` (so components use `bg-surface`, `text-muted`, `text-film`…); fonts are self-hosted via `@fontsource-variable`. Kind colors come from one helper so every screen agrees. The work page is split into small presentational components (hero, section nav, trailer) fed by the existing loaders; TMDB backdrops are added to the catalog data with one migration.

**Tech Stack:** Next.js 15 · Tailwind CSS v4 · `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/figtree` · Supabase migration · Vitest + Testing Library · Playwright (visual check on the Vercel preview).

**Spec:** `docs/superpowers/specs/2026-11-16-lobby-identidade-visual-design.md`

## Global Constraints

- Tokens (exact): bg `#17121f`, surface `#1f1829`, surface-2 `#2a2136`, line `#3a2f4c`, fg `#f3eefb`, muted `#b3a9c6`, film `#ff7a59`, serie `#8f7bff`, livro `#3fd0a2`, danger `#ff6b6b`, warn `#f0b04a`, success `#5cd68f`. Dark only; `color-scheme: dark`.
- Display font Bricolage Grotesque, body font Figtree, with system fallbacks.
- Kind labels: movie "Filme", series "Série", book "Livro". Color is never the only cue.
- No business logic changes; all existing tests keep passing except the Trailer test, which changes to click-to-load.
- No raw `neutral-*`, `amber-*`, `red-*`, `green-*` Tailwind colors left in `src/` after Task 4.

## Review Focus

1. Work with no backdrop (books, obscure films) → hero falls back to the blurred poster or a plain gradient; nothing broken or empty. (Task 3)
2. Long titles (e.g. 80+ characters) and long original titles on a 375px phone → wrap without overflow. (Task 3, visual check)
3. Keyboard users → every link/button still has a visible focus ring on the dark background. (Task 1)
4. Section nav anchors land below the sticky header (not hidden under it). (Task 3)
5. Trailer → no YouTube iframe or cookie until the person clicks. (Task 3)

---

### Task 1: Tokens, fonts, logo, kind helper and header

**Files:** Modify `src/app/globals.css`, `src/app/layout.tsx`, `src/components/SearchBox.tsx`, `src/components/UserMenu.tsx`, `src/components/Footer.tsx`; Create `src/lib/kind-style.ts`, `src/components/Logo.tsx`, `src/components/KindTag.tsx`; Test `tests/components/KindTag.test.tsx`, `tests/kind-style.test.ts`.

**Interfaces — Produces:**
- `KIND_LABEL: Record<WorkKind, 'Filme' | 'Série' | 'Livro'>`, `kindTextClass(kind)` → `'text-film' | 'text-serie' | 'text-livro'`, `kindBgClass(kind)` → `'bg-film' | 'bg-serie' | 'bg-livro'`, `kindBorderClass(kind)`.
- `<KindTag kind />` — small uppercase tag with the kind's background and dark text, content = label.
- `<Logo />` — "Lobby" + three 7px dots (film, serie, livro), `aria-label="Lobby"`, links to `/`.
- Tailwind theme colors `bg, surface, surface-2, line, fg, muted, film, serie, livro, danger, warn, success`; font utilities `font-display`, `font-body`; global `:focus-visible` outline 2px `fg`.

- [ ] Step 1: tests — `KIND_LABEL.series === 'Série'`; `kindTextClass('book') === 'text-livro'`; `<KindTag kind="movie" />` renders text "Filme" with class `bg-film`.
- [ ] Step 2: `npm test` → FAIL.
- [ ] Step 3: implement; header = Logo · SearchBox (hidden below `sm`, replaced by a search icon link to `/busca`) · UserMenu; install fonts.
- [ ] Step 4: `npm test && npm run typecheck && npm run lint && npm run build` → PASS.
- [ ] Step 5: commit `feat(ui): Saguão tokens, fonts, logo and header`.

### Task 2: Backdrops in the catalog

**Files:** Create `supabase/migrations/20261118000000_backdrops.sql` (`alter table works add column backdrop_url text`); Modify `src/lib/catalog/types.ts` (+ `backdropUrl: string | null`), `tmdb-normalize.ts` (`https://image.tmdb.org/t/p/w1280` + `backdrop_path`), `books-normalize.ts` (`null`), `repository.ts` (read/write column); fixtures get `backdrop_path`; Test: additions to `tests/catalog/tmdb-normalize.test.ts`, `books-normalize.test.ts`, `tests/db/catalog.test.ts` (column exists, anon can read it).

- [ ] Step 1: tests — movie 603 `backdropUrl` starts with `https://image.tmdb.org/t/p/w1280/`; no `backdrop_path` → `null`; books → `null`; DB: `select backdrop_url from works` works for anon.
- [ ] Step 2: run → FAIL. Step 3: implement. Step 4: `npm test && npm run test:db` → PASS. Step 5: commit `feat(catalog): store TMDB backdrops`.
- Note: works cached before this change get the backdrop on their next 7-day refresh.

### Task 3: Work page redesign

**Files:** Create `src/components/work/WorkHero.tsx`, `src/components/work/SectionNav.tsx`; Modify `src/components/work/Trailer.tsx` (client, click-to-load), `src/app/obra/[kind]/[externalId]/page.tsx`, `src/lib/community/queries.ts` (+ `countTopics(workId): Promise<number>`), `src/components/community/CommunitySection.tsx`, `src/components/list/ListControls.tsx`, `src/components/work/AvailabilityList.tsx` (token classes); Test `tests/components/WorkHero.test.tsx`, update `tests/components/Trailer.test.tsx`.

**Interfaces — Produces:** `<WorkHero work topicCount communityHref children />` (children = list controls), `<SectionNav items: Array<{ id: string; label: string }> />`, `<Trailer youtubeKey title />`.

Behavior: hero background = backdrop (gradient fade to bg) → else poster blurred/darkened → else gradient in the kind color; poster overlaps the hero bottom; KindTag; title (balance-wrapped, `break-words`), year, original title; `topicCount` line "N tópicos" / "1 tópico" / "Seja o primeiro a abrir um tópico" linking `#comunidade`; children below. Sections `#comunidade`, `#sobre`, `#onde-assistir` with `scroll-margin-top` ≥ sticky header + nav height. Desktop (`lg`): main column (Comunidade, Sobre) + aside (Onde assistir, Trailer). Trailer: shows thumbnail `https://i.ytimg.com/vi/{key}/hqdefault.jpg` with button "▶ Trailer de {title}"; iframe only after click.

- [ ] Step 1: tests — WorkHero: renders KindTag "Série", "24 tópicos" link to `#comunidade`, "1 tópico", 0 → "Seja o primeiro a abrir um tópico"; with `backdropUrl` the hero has a background image element; without backdrop and without poster still renders title. Trailer: null → nothing; with key → no iframe, button "▶ Trailer de Matrix"; after click → iframe src `https://www.youtube-nocookie.com/embed/abc?autoplay=1`.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: all checks PASS. Step 5: commit `feat(ui): community-first work page with backdrop hero`.

### Task 4: Restyle the remaining screens

**Files:** every remaining component/page under `src/` that uses `neutral-*`, `amber-*`, `red-*`, `green-*` (search, home, Minha lista, topic, new topic, forms, login, welcome, import, admin, footer).

Rules: text-neutral-500 → `text-muted`; borders → `border-line`; cards → `bg-surface`; primary button → `bg-fg text-bg`; errors → `text-danger`; warnings/spoilers → `warn`; success → `success`; search results and Minha lista show the kind (KindTag or a kind-colored bottom border + label). Home: headline "Onde filmes, séries e livros viram conversa." + search + three kind chips.

- [ ] Step 1: guard test `tests/ui/no-raw-colors.test.ts` — reads every `.tsx` under `src/` and expects no match of `/\b(?:bg|text|border|divide)-(?:neutral|amber|red|green)-\d+/`.
- [ ] Step 2: FAIL (lists files). Step 3: restyle. Step 4: all checks PASS. Step 5: commit `feat(ui): restyle all screens with Saguão tokens`.

### Task 5: Visual check

- [ ] After the PR's Vercel preview is ready, Playwright screenshots (desktop 1280 and iPhone 13) of `/`, `/busca?q=matrix`, `/obra/filme/603`, `/obra/serie/1399`, `/obra/livro/OL1149208W`, `/entrar`; fix overflow/contrast issues found; one round only.
