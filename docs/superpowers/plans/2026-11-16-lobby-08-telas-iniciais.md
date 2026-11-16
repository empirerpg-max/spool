# Lobby — Plano 8: Telas iniciais (Etapa 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Signed-in home shows release rows (Filmes, Séries, Livros) plus a compact timeline; the Timeline page gets a compact "Em alta nos lançamentos" strip; signed-out home explains the club (hero, how it works, example cards, films in theatres).

**Architecture:** Release lists are fetched live from TMDB/Google Books and cached for a few hours with `fetch(..., { next: { revalidate } })` (portable, no Vercel-only APIs). They are never written to the database; works are only saved when someone opens their page (existing behavior). Pure normalizers/rankers are unit-tested; components are tested with fixtures.

**Spec:** `docs/superpowers/specs/2026-11-16-lobby-clube-social-design.md` (Etapa 2).

## Global Constraints
- Release data is display-only: no inserts into `works`, not part of the daily check.
- Each source failing independently → that row is hidden or shows a short "Não foi possível carregar agora." line; the page never errors.
- Cache: 6 h for releases (books 12 h).
- pt-BR plain copy; Saguão visual style; kind colors via existing KindTag/kind-style.
- Signed-out visitors see no member content (example cards are fictional and labelled "exemplo").

## Review Focus
1. TMDB or Google Books down → home still renders. (Task 1, 2)
2. Release items link to the right work page (`/obra/[kind]/[externalId]`) for films, series and books. (Task 1)
3. Signed-out home exposes no real member data. (Task 4)
4. Phone layout: rows scroll horizontally, no page-wide horizontal scroll. (Tasks 2–4)

### Task 1: Release sources
`src/lib/home/releases.ts` (+ tests): `type ReleaseItem = { kind: 'filme'|'serie'|'livro' (use the app's existing kind values); externalId; title; posterUrl|null; date|null; popularity: number; label?: string }`.
- Films: TMDB `/movie/now_playing?region=BR&language=pt-BR` ("Nos cinemas") and `/movie/upcoming?region=BR&language=pt-BR` filtered to future dates ("Em breve nos cinemas").
- Series: TMDB `/tv/on_the_air?language=pt-BR` and/or `/discover/tv` with recent first_air_date, sorted by popularity, top 20, skipping items without poster.
- Books: Google Books `q=subject:fiction` (or similar) `langRestrict=pt&orderBy=newest&printType=books&maxResults=40`, keep items with cover and a published date in the last ~6 months, dedupe by title; accept imprecision (spec).
- `trending(releases)`: pure, picks ~8 mixed items (≈3 films, 3 series, 2 books) by popularity for the Timeline strip.
- Reuse existing TMDB/Google clients, image URL helpers, and kind/route helpers.

### Task 2: Signed-in home
`src/app/page.tsx` signed-in branch: rows "Filmes — nos cinemas", "Filmes — em breve", "Séries no ar", "Livros recém-lançados" (horizontal poster rows, `ReleaseRow` component) and a "Timeline" panel (first ~8 items using existing TimelineItem, "Ver timeline completa" → /timeline; empty → suggestions as in TimelineEmpty, compact). Desktop: rows left, timeline right column; phone: timeline below rows. Remove the old signed-in sections that duplicate the bell (list news). Tests: ReleaseRow renders items/links and empty/error state.

### Task 3: Timeline strip
`/timeline`: compact strip "Em alta nos lançamentos" at top (small posters, one row, scrolls on phone) + "Ver todos" → `/`. Tests.

### Task 4: Signed-out home
Hero "Um clube para quem ama filmes, séries e livros", buttons "Tenho um convite" (→ /criar-conta) and "Já sou membro" (→ /entrar), line "Ainda não tem convite? Peça para quem te indicou o Lobby."; "Como funciona" in 3 steps (Monte sua lista · Saiba onde assistir e receba avisos · Converse com o clube); "Por dentro do clube": 2–3 fictional example cards (a publicação and a comunidade) visibly tagged "exemplo"; "Nos cinemas esta semana" with real data; search stays available. Tests: copy, buttons' links, example tag present.
