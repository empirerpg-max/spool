# Lobby — Plano 9: Avaliações (Etapa 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Work pages show the "Nota do Lobby" (average of members' stars, with count, only from 3 ratings) and, for films and series, IMDb and Rotten Tomatoes scores via OMDb.

**Architecture:** A security-definer SQL function aggregates `list_items.rating` without exposing who rated what. External scores are stored on `works` (imdb_id, imdb_rating, imdb_votes, rt_score, ratings_checked_on) and refreshed when a work is fetched/saved and by the daily job, at most once every 7 days per work; without `OMDB_API_KEY` everything is skipped silently.

**Spec:** `docs/superpowers/specs/2026-11-16-lobby-clube-social-design.md` (Etapa 3).

## Global Constraints
- Lobby rating: `avg(rating)` rounded to 1 decimal and `count(rating)` over list_items with non-null rating; average returned as null when count < 3; never returns per-user data. Callable by anon and authenticated (work pages are public).
- OMDb: `https://www.omdbapi.com/?i=<imdb_id>&apikey=...`; parse `imdbRating` ("N/A" → null), `imdbVotes`, `Ratings[{Source:"Rotten Tomatoes", Value:"93%"}]`. Timeout 5 s; failures never break the page or the job. Budget: free plan 1000/day — refresh only when `ratings_checked_on` is null or older than 7 days; daily job caps OMDb calls at 200 per run.
- IMDb id comes from TMDB (`external_ids` via append_to_response, or `imdb_id` on movie details).
- Display: "Nota do Lobby 4,2 ★ · 12 avaliações" (pt-BR decimal comma); below 3: "Ainda poucas avaliações no Lobby" (or hide). IMDb "7,8/10" with link to imdb.com/title/<id>; Rotten Tomatoes "93%" (no logo images needed). Books: only Lobby rating.
- pt-BR plain copy; Saguão style.

## Review Focus
1. Two ratings only → no average shown, and no way to infer an individual rating via the API. (Task 1)
2. OMDb missing key / down / "N/A" → page renders, nothing broken. (Task 2)
3. OMDb not called on every page view (7-day rule). (Task 2)

### Task 1: Database
Migration `supabase/migrations/20261124000000_ratings.sql`: works columns `imdb_id text`, `imdb_rating numeric(3,1)`, `imdb_votes int`, `rt_score int check 0..100`, `ratings_checked_on date`; function `lobby_rating(p_work uuid) returns table(average numeric, ratings int)` security definer, search_path public, grant to anon, authenticated. Make sure the catalog save path (service role) can write the new columns (check existing grants). DB tests.

### Task 2: OMDb client + refresh
`src/lib/catalog/omdb.ts` (`parseOmdb(json)` pure + `fetchOmdbRatings(imdbId)`), capture imdb id in the TMDB normalizer, refresh logic in the repository/get-work save path (only when due) and in the daily job (cap 200). Tests: parser (N/A, missing RT, votes with commas), due rule, no key → no call.

### Task 3: UI
`src/components/work/Ratings.tsx` in WorkHero area: Lobby rating, IMDb, RT. Tests for formats and empty states.

### Task 4: Docs
`docs/setup-chaves.md` section 11 "Notas do IMDb e Rotten Tomatoes (OMDb)": omdbapi.com → API Key → FREE → e-mail → activate via e-mail link → Vercel `OMDB_API_KEY` (Secret, Production and Preview) → Redeploy. Notes: free limit 1000/day; works without it (just no external scores).
