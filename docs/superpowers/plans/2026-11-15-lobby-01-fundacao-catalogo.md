# Lobby — Plano 1: Fundação e Catálogo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, installable Lobby site where anyone can search movies, series and books and open a work page with synopsis, trailer, people, and where to watch/buy in Brazil — data fetched on demand from TMDB / Open Library / Google Books and cached in Supabase.

**Architecture:** Next.js App Router (TypeScript) renders pages on the server. A `catalog` module has pure normalizers (API JSON → `NormalizedWork`) separated from thin HTTP clients, so all mapping logic is unit-tested with fixtures. Works are cached in Supabase Postgres (`works`, `availability`, `seasons`) and refreshed on read when stale. No login in this plan.

**Tech Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS · Supabase (Postgres, `@supabase/supabase-js`, Supabase CLI for migrations) · Vitest + Testing Library · TMDB API v3 · Open Library API · Google Books API v1.

**Spec:** `docs/superpowers/specs/2026-11-14-lobby-design.md`

**Roadmap (this plan is 1 of 4; each later plan gets its own document):**
1. **Fundação e catálogo** (this) — busca, página da obra, cache.
2. **Contas e lista pessoal** — login (e-mail + Google), lista com estados, nota e resenha privada, importação CSV Letterboxd/Goodreads.
3. **Comunidades** — comunidade por obra, tópicos, respostas, spoilers, resenha publicada como tópico, denúncias, admin, bloqueio de domínios piratas.
4. **Avisos e Início** — tarefa diária (`pg_cron` + Edge Function), eventos, Web Push, resumo diário por e-mail, tela Início, service worker.

## Global Constraints

- Idioma e região: todas as chamadas TMDB usam `language=pt-BR` e dados de país `BR`; textos da interface em português do Brasil.
- Sinopse: usar pt-BR; se vazia, cair para inglês e marcar `overviewLang: 'en'` (a UI mostra "Sinopse em inglês").
- Onde a disponibilidade de streaming for exibida, mostrar o crédito visível **"Dados de streaming: JustWatch"** com link para `https://www.justwatch.com/br`.
- Rodapé em todas as páginas com o logo do TMDB e o texto: "Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB."
- Portabilidade: proibido usar recursos exclusivos da Vercel (Vercel Cron, KV, Blob, Edge Config, `@vercel/*`). `next.config.ts` define `images: { unoptimized: true }`; imagens vêm direto de `image.tmdb.org`, `covers.openlibrary.org` e `books.google.com`.
- Nunca copiar catálogos inteiros: obra só entra no banco quando alguém a abre.
- Segredos só no servidor: `TMDB_API_READ_TOKEN`, `GOOGLE_BOOKS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Públicos: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Nenhum link para conteúdo pirata; "onde assistir" lista só provedores vindos do TMDB/JustWatch.
- Slugs de URL em português: `filme`, `serie`, `livro` ↔ `movie`, `series`, `book`.

## Review Focus

1. Obra sem nenhum provedor no Brasil → página mostra "Ainda não disponível em streaming no Brasil", sem seção vazia nem erro. (Task 6)
2. Obra sem sinopse em pt-BR → mostra a sinopse em inglês marcada como tal; sem nenhuma sinopse → "Sinopse indisponível". (Task 2)
3. Livro sem correspondência no Google Books ou sem capa → página funciona com dados da Open Library e capa substituta. (Task 3)
4. ID inexistente ou slug inválido na URL (`/obra/filme/abc`, `/obra/podcast/1`) → página 404, nunca 500. (Task 6)
5. TMDB fora do ar ou devolvendo 429 → busca mostra os resultados de livros e uma mensagem "Filmes e séries indisponíveis no momento"; página de obra já em cache continua abrindo com os dados guardados. (Tasks 2, 4, 5)

---

## File Structure

```
next.config.ts                      images.unoptimized, no Vercel features
vitest.config.ts                    jsdom env, @/ alias
.env.example                        all env var names, no values
public/manifest.webmanifest         PWA manifest (name "Lobby", lang pt-BR)
public/icons/icon-192.png, icon-512.png
supabase/migrations/20261115000000_catalog.sql
src/app/layout.tsx                  html lang="pt-BR", manifest link, <Footer/>
src/app/page.tsx                    placeholder home with search box
src/app/busca/page.tsx              unified search results
src/app/obra/[kind]/[externalId]/page.tsx   work page
src/app/obra/[kind]/[externalId]/not-found.tsx
src/components/Footer.tsx           TMDB attribution
src/components/SearchBox.tsx
src/components/work/AvailabilityList.tsx
src/components/work/Trailer.tsx
src/lib/catalog/types.ts            shared types
src/lib/catalog/kind.ts             slug <-> kind
src/lib/catalog/tmdb-normalize.ts   pure TMDB -> NormalizedWork / SearchHit
src/lib/catalog/tmdb-client.ts      HTTP
src/lib/catalog/books-normalize.ts  pure OL + Google Books -> NormalizedWork / SearchHit
src/lib/catalog/books-client.ts     HTTP
src/lib/catalog/cinema.ts           cinemaStatus()
src/lib/catalog/errors.ts           CatalogUnavailableError, WorkNotFoundError
src/lib/catalog/repository.ts       Supabase read/write of works
src/lib/catalog/get-work.ts         cache-or-fetch
src/lib/catalog/search.ts           merged search
src/lib/supabase/server.ts          service-role client (server only)
tests/fixtures/                     hand-trimmed API JSON
tests/**/*.test.ts(x)
```

## Shared types (defined in Task 2, used everywhere)

```ts
// src/lib/catalog/types.ts
export type WorkKind = 'movie' | 'series' | 'book';
export type AvailabilityType = 'subscription' | 'free' | 'ads' | 'rent' | 'buy' | 'store';
export interface Availability { provider: string; logoUrl: string | null; type: AvailabilityType; link: string | null; }
export interface Season { number: number; airDate: string | null; episodeCount: number; }
export interface NormalizedWork {
  kind: WorkKind;
  externalId: string;            // TMDB id as string, or Open Library work id ("OL45804W")
  title: string;
  originalTitle: string | null;
  overview: string | null;
  overviewLang: 'pt-BR' | 'en' | null;
  posterUrl: string | null;
  releaseDateBR: string | null;  // ISO yyyy-mm-dd; movie: BR theatrical (fallback global), series: first air, book: publish date
  theatricalDateBR: string | null; // movies only
  digitalDateBR: string | null;    // movies only
  trailerYoutubeKey: string | null;
  people: string[];              // top 5 cast, or authors
  availability: Availability[];
  seasons: Season[];             // series only, else []
  isbns: string[];               // books only, else []
}
export interface SearchHit { kind: WorkKind; externalId: string; title: string; year: number | null; posterUrl: string | null; }
```

---

### Task 1: Project scaffold, PWA manifest, attribution footer

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/Footer.tsx`, `src/components/SearchBox.tsx`
- Test: `tests/components/Footer.test.tsx`

**Interfaces:**
- Produces: `<Footer />`, `<SearchBox defaultValue?: string />` (GET form to `/busca?q=`), scripts `npm test` (vitest run), `npm run build`, `npm run lint`.

- [ ] **Step 1:** Scaffold with `npx create-next-app@15 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`; add dev deps `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`. Configure `vitest.config.ts` (environment `jsdom`, alias `@` → `src`, setup file importing `@testing-library/jest-dom/vitest`). Set `images: { unoptimized: true }` in `next.config.ts`.
- [ ] **Step 2: Write the failing test** `tests/components/Footer.test.tsx`:
  - `renders TMDB attribution`: `render(<Footer/>)`; expect text `"Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB."`; expect an `img` with alt `"TMDB"`.
- [ ] **Step 3:** Run `npx vitest run tests/components/Footer.test.tsx` → FAIL (module not found).
- [ ] **Step 4:** Implement `Footer` (TMDB logo from `https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg`, alt "TMDB"), `SearchBox`, `layout.tsx` (`<html lang="pt-BR">`, `<link rel="manifest">`, `theme-color`, Footer), `page.tsx` (title "Lobby" + SearchBox). Manifest: `name` "Lobby", `short_name` "Lobby", `lang` "pt-BR", `start_url` "/", `display` "standalone", both icons. `.env.example` lists every env var from Global Constraints.
- [ ] **Step 5:** Run `npm test && npm run build` → tests PASS, build succeeds.
- [ ] **Step 6:** Commit `feat: scaffold Lobby Next.js app with PWA manifest and TMDB attribution`.

---

### Task 2: TMDB normalization and cinema status (pure)

**Files:**
- Create: `src/lib/catalog/types.ts` (exact block above), `src/lib/catalog/tmdb-normalize.ts`, `src/lib/catalog/cinema.ts`
- Test: `tests/catalog/tmdb-normalize.test.ts`, `tests/catalog/cinema.test.ts`, fixtures `tests/fixtures/tmdb-movie-603.json`, `tmdb-movie-no-br.json`, `tmdb-tv-1399.json`, `tmdb-search-multi.json` (hand-trimmed real responses with `append_to_response=videos,credits,watch/providers,release_dates` for movies and `videos,aggregate_credits,watch/providers` for TV)

**Interfaces:**
- Produces:
  - `normalizeTmdbMovie(ptBr: unknown, enOverview: string | null): NormalizedWork`
  - `normalizeTmdbTv(ptBr: unknown, enOverview: string | null): NormalizedWork`
  - `normalizeTmdbSearch(json: unknown): SearchHit[]` (from `/search/multi`; keeps only `media_type` movie/tv)
  - `cinemaStatus(w: Pick<NormalizedWork,'theatricalDateBR'|'digitalDateBR'>, today: string): 'em_cartaz' | 'em_breve' | null`

Mapping rules the tests pin:
- Poster: `https://image.tmdb.org/t/p/w500` + `poster_path`, or `null`.
- Watch providers from `["watch/providers"].results.BR`: `flatrate`→`subscription`, `free`→`free`, `ads`→`ads`, `rent`→`rent`, `buy`→`buy`; `link` = `results.BR.link`; logo `https://image.tmdb.org/t/p/w92` + `logo_path`. Missing BR → `[]`. Dedupe by (provider, type).
- Movie dates from `release_dates.results` where `iso_3166_1 === 'BR'`: earliest of type 2/3 → `theatricalDateBR`; earliest of type 4 → `digitalDateBR`; dates truncated to `yyyy-mm-dd`. `releaseDateBR` = `theatricalDateBR ?? release_date || null`.
- Trailer: first `videos.results` with `site === 'YouTube'` and `type === 'Trailer'`, preferring `iso_639_1 === 'pt'`, then any.
- People: first 5 names of `credits.cast` (movie) / `aggregate_credits.cast` (TV).
- Seasons: TV `seasons` excluding `season_number === 0`, mapped to `{ number, airDate: air_date || null, episodeCount: episode_count }`.
- Overview: pt-BR `overview` if non-empty → lang `pt-BR`; else `enOverview` if non-empty → lang `en`; else `null`/`null`.
- `cinemaStatus`: `em_breve` if `theatricalDateBR > today`; `em_cartaz` if `theatricalDateBR <= today`, `today <= theatricalDateBR + 60 days`, and (`digitalDateBR` is null or `> today`); else `null`.

- [ ] **Step 1: Write the failing tests:**
  - `movie 603 maps title, poster, BR providers and trailer` — title `"Matrix"`, `posterUrl` starts with `https://image.tmdb.org/t/p/w500/`, `availability` contains an item with `type: 'subscription'`, `trailerYoutubeKey` equals the fixture's pt trailer key, `people.length === 5`.
  - `movie without BR providers has empty availability` (fixture `tmdb-movie-no-br.json`) — `availability` `[]`.
  - `falls back to English overview` — fixture with `overview: ""`, `enOverview = "A hacker..."` → `overview === "A hacker..."`, `overviewLang === 'en'`; with `enOverview = null` → both `null`.
  - `tv 1399 maps seasons without specials` — no season with `number === 0`, `seasons[0].number === 1`, `kind === 'series'`.
  - `search keeps only movies and series` — fixture includes a `person` hit; result has no person, `year` parsed from `release_date`/`first_air_date`.
  - `cinemaStatus` table: (`theatrical 2026-12-01`, today `2026-11-15`) → `em_breve`; (`2026-11-01`, null, `2026-11-15`) → `em_cartaz`; (`2026-11-01`, `2026-11-10`, `2026-11-15`) → `null`; (`2026-08-01`, null, `2026-11-15`) → `null`; (null, null) → `null`.
- [ ] **Step 2:** Run `npx vitest run tests/catalog` → FAIL.
- [ ] **Step 3:** Implement the three modules per the rules above. Validate input shape loosely (treat missing fields as absent; never throw on missing optional fields).
- [ ] **Step 4:** Run `npx vitest run tests/catalog` → PASS.
- [ ] **Step 5:** Commit `feat(catalog): normalize TMDB movies, series and search`.

---

### Task 3: Books normalization — Open Library work + Google Books enrichment (pure)

**Files:**
- Create: `src/lib/catalog/books-normalize.ts`
- Test: `tests/catalog/books-normalize.test.ts`, fixtures `tests/fixtures/ol-search.json` (`/search.json`), `ol-work-OL45804W.json` (`/works/{id}.json`), `ol-editions-OL45804W.json` (`/works/{id}/editions.json`), `gbooks-isbn.json` (`/volumes?q=isbn:...`), `gbooks-empty.json`

**Interfaces:**
- Produces:
  - `normalizeOpenLibrarySearch(json: unknown): SearchHit[]` — `externalId` = work key without `/works/` prefix; `year` = `first_publish_year`; poster `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg` or `null`.
  - `pickIsbns(editions: unknown): string[]` — ISBN-13 then ISBN-10, Portuguese-language editions (`languages` contains `/languages/por`) first, deduped, max 10.
  - `normalizeBook(work: unknown, authors: string[], isbns: string[], gbooks: unknown | null): NormalizedWork`

Mapping rules the tests pin:
- Title: Google Books `volumeInfo.title` when gbooks has an item (Portuguese title), else OL `title`; `originalTitle` = OL `title` when different, else `null`.
- Overview: gbooks `volumeInfo.description` (HTML tags stripped) → `pt-BR` if `volumeInfo.language === 'pt'` else `en`; else OL `description` (string or `{value}`) → `en`; else `null`.
- Poster: gbooks `imageLinks.thumbnail` with `http:` → `https:` and `&zoom=1`; else OL `covers[0]` URL; else `null`.
- `releaseDateBR`: gbooks `publishedDate` normalized to `yyyy-mm-dd` (`"2019"` → `"2019-01-01"`, `"2019-05"` → `"2019-05-01"`); else `null`.
- Availability (type `store`, `logoUrl: null`): if gbooks `saleInfo.buyLink` → `{provider:'Google Play Livros', link}`; always, when `isbns[0]` exists, `{provider:'Amazon', link:'https://www.amazon.com.br/s?k=' + isbns[0]}`; always `{provider:'Estante Virtual', link:'https://www.estantevirtual.com.br/busca?q=' + encodeURIComponent(title)}`.
- `trailerYoutubeKey: null`, `seasons: []`, `theatricalDateBR`/`digitalDateBR: null`, `people: authors`.

- [ ] **Step 1: Write the failing tests:**
  - `search maps OL works to hits` — first hit `externalId` matches `/^OL\d+W$/`, `kind === 'book'`.
  - `prefers Portuguese editions ISBNs` — first ISBN belongs to the `/languages/por` edition in the fixture.
  - `enriches with Google Books in Portuguese` — title from gbooks, `overviewLang === 'pt-BR'`, no `<` in overview, poster starts with `https://`.
  - `works without Google Books match` — `gbooks = gbooks-empty.json` → title from OL, poster from OL covers, availability has Amazon and Estante Virtual, no Google Play.
  - `no cover anywhere gives null poster` — work with no `covers`, gbooks null → `posterUrl === null`.
  - `normalizes partial dates` — `"2019"` → `"2019-01-01"`.
- [ ] **Step 2:** Run `npx vitest run tests/catalog/books-normalize.test.ts` → FAIL.
- [ ] **Step 3:** Implement per rules.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(catalog): normalize books from Open Library and Google Books`.

---

### Task 4: HTTP clients with error handling

**Files:**
- Create: `src/lib/catalog/errors.ts`, `src/lib/catalog/tmdb-client.ts`, `src/lib/catalog/books-client.ts`
- Test: `tests/catalog/tmdb-client.test.ts`, `tests/catalog/books-client.test.ts`

**Interfaces:**
- Consumes: normalizers from Tasks 2–3.
- Produces:
  - `class CatalogUnavailableError extends Error { source: 'tmdb' | 'books' }`, `class WorkNotFoundError extends Error`
  - `fetchTmdbWork(kind: 'movie' | 'series', id: string, fetchImpl = fetch): Promise<NormalizedWork>` — pt-BR request with appends; if pt-BR overview empty, one extra request with `language=en-US` for the overview only.
  - `searchTmdb(query: string, fetchImpl = fetch): Promise<SearchHit[]>` — `/search/multi?language=pt-BR&region=BR&include_adult=false`.
  - `fetchBook(olWorkId: string, fetchImpl = fetch): Promise<NormalizedWork>` — OL work + author names (`/authors/{key}.json`, max 3) + editions; Google Books by `isbn:{first}`, else by `intitle:{title}+inauthor:{author}&langRestrict=pt`; key `GOOGLE_BOOKS_API_KEY`.
  - `searchBooks(query: string, fetchImpl = fetch): Promise<SearchHit[]>` — `https://openlibrary.org/search.json?q=...&limit=10&fields=key,title,first_publish_year,cover_i`.

Rules: TMDB uses header `Authorization: Bearer ${TMDB_API_READ_TOKEN}`. HTTP 404 → `WorkNotFoundError`. HTTP 429 → wait `Retry-After` seconds (default 1, cap 5) and retry once; still failing, or any 5xx / network error → `CatalogUnavailableError`. Every request has a 8s timeout (`AbortSignal.timeout(8000)`). Google Books failure is non-fatal: book is normalized with `gbooks = null`. Open Library requests send header `User-Agent: Lobby/0.1 (catalog)`.

- [ ] **Step 1: Write the failing tests** (inject `fetchImpl` as `vi.fn` returning `Response` objects built from fixtures):
  - `fetchTmdbWork returns normalized movie` — one call when pt overview present.
  - `fetches English overview when Portuguese is empty` — two calls, second URL contains `language=en-US`.
  - `404 throws WorkNotFoundError`.
  - `429 retries once then succeeds` — first 429 with `Retry-After: 0`, second 200 → resolves.
  - `500 throws CatalogUnavailableError with source tmdb`.
  - `fetchBook survives Google Books failure` — gbooks call returns 500 → resolves with OL title.
  - `searchBooks encodes accents` — query `"memórias póstumas"` → URL contains `mem%C3%B3rias`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(catalog): TMDB and books HTTP clients with retry and errors`.

---

### Task 5: Supabase schema, repository and cache-or-fetch

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/20261115000000_catalog.sql`, `src/lib/supabase/server.ts`, `src/lib/catalog/repository.ts`, `src/lib/catalog/get-work.ts`
- Test: `tests/catalog/get-work.test.ts`

**Interfaces:**
- Consumes: `fetchTmdbWork`, `fetchBook`, errors (Task 4).
- Produces:
  - `createServiceClient(): SupabaseClient` (server only; throws if imported in a client component — add `import 'server-only'`).
  - `interface WorkRepository { find(kind: WorkKind, externalId: string): Promise<{ work: NormalizedWork; id: string; syncedAt: string } | null>; save(work: NormalizedWork): Promise<string /* id */>; }` and `supabaseWorkRepository(client): WorkRepository`.
  - `needsRefresh(syncedAt: string, now: Date): boolean` — true when older than 7 days.
  - `getOrFetchWork(kind, externalId, deps?: { repo?: WorkRepository; fetchers?: { tmdb: typeof fetchTmdbWork; book: typeof fetchBook }; now?: Date }): Promise<{ id: string; work: NormalizedWork; stale: boolean }>`

Schema (migration):
- `create type work_kind as enum ('movie','series','book');`
- `works`: `id uuid pk default gen_random_uuid()`, `kind work_kind not null`, `external_id text not null`, `title text not null`, `original_title text`, `overview text`, `overview_lang text`, `poster_url text`, `release_date_br date`, `theatrical_date_br date`, `digital_date_br date`, `trailer_youtube_key text`, `people text[] not null default '{}'`, `isbns text[] not null default '{}'`, `synced_at timestamptz not null default now()`, `created_at timestamptz not null default now()`, `unique (kind, external_id)`.
- `availability`: `work_id uuid references works on delete cascade`, `provider text`, `type text check (type in ('subscription','free','ads','rent','buy','store'))`, `logo_url text`, `link text`, `first_seen_at timestamptz not null default now()`, `primary key (work_id, provider, type)`.
- `seasons`: `work_id uuid references works on delete cascade`, `number int`, `air_date date`, `episode_count int`, `primary key (work_id, number)`.
- RLS enabled on all three; policy `select` for `anon, authenticated` using `true`; no insert/update/delete policies (writes only via service role).

Behavior: `save` upserts `works` on `(kind, external_id)`, replaces `seasons`; for `availability`, deletes rows no longer present and inserts new ones **without touching `first_seen_at` of rows that remain** (plan 4 relies on this to detect "entrou no streaming"). `getOrFetchWork`: cache hit and fresh → return it (`stale: false`); miss → fetch, save, return; hit but stale → try fetch+save; on `CatalogUnavailableError` return cached with `stale: true`; `WorkNotFoundError` propagates.

- [ ] **Step 1: Write the failing tests** (in-memory fake `WorkRepository`, stub fetchers):
  - `needsRefresh` — 6 days → false; 8 days → true.
  - `cache miss fetches and saves` — fetcher called once, repo has the work.
  - `fresh hit does not fetch`.
  - `stale hit refreshes`.
  - `stale hit with source down returns cached copy` — fetcher throws `CatalogUnavailableError` → result `stale: true`, same title.
  - `miss with source down throws CatalogUnavailableError`.
- [ ] **Step 2:** Run `npx vitest run tests/catalog/get-work.test.ts` → FAIL.
- [ ] **Step 3:** Write the migration; implement `server.ts`, `repository.ts`, `get-work.ts`.
- [ ] **Step 4:** Run tests → PASS. Then `npx supabase start && npx supabase db reset` (needs Docker) → migration applies with no errors; `psql` check: `select count(*) from works;` returns `0`. If Docker is unavailable in the environment, record that in the commit message and verify against the hosted project's SQL editor instead.
- [ ] **Step 5:** Commit `feat(catalog): works schema, repository and cache-or-fetch`.

---

### Task 6: Search page and work page

**Files:**
- Create: `src/lib/catalog/kind.ts`, `src/lib/catalog/search.ts`, `src/app/busca/page.tsx`, `src/app/obra/[kind]/[externalId]/page.tsx`, `src/app/obra/[kind]/[externalId]/not-found.tsx`, `src/components/work/AvailabilityList.tsx`, `src/components/work/Trailer.tsx`
- Test: `tests/catalog/kind.test.ts`, `tests/catalog/search.test.ts`, `tests/components/AvailabilityList.test.tsx`, `tests/components/Trailer.test.tsx`

**Interfaces:**
- Consumes: `searchTmdb`, `searchBooks` (Task 4), `getOrFetchWork` (Task 5), `cinemaStatus` (Task 2).
- Produces:
  - `kindFromSlug(slug: string): WorkKind | null`, `slugFromKind(kind: WorkKind): 'filme' | 'serie' | 'livro'`, `workPath(kind, externalId): string` → `/obra/filme/603`, `isValidExternalId(kind: WorkKind, id: string): boolean` (TMDB `/^\d+$/`, book `/^OL\d+W$/`).
  - `searchCatalog(query: string, deps?): Promise<{ hits: SearchHit[]; unavailable: Array<'tmdb' | 'books'> }>`
  - `<AvailabilityList kind: WorkKind items: Availability[] />`, `<Trailer youtubeKey: string | null />`

Rules:
- `searchCatalog`: trims; empty or < 2 chars → `{ hits: [], unavailable: [] }` with no calls. Runs both searches in parallel (`Promise.allSettled`); a rejected source goes into `unavailable`. Order: TMDB hits first (TMDB's own relevance), then books.
- Search page: groups hits under "Filmes", "Séries", "Livros"; each hit links to `workPath`; if `unavailable` includes `tmdb`, show "Filmes e séries indisponíveis no momento"; zero hits → "Nada encontrado para “{q}”".
- Work page: `kindFromSlug` null → `notFound()`; `isValidExternalId` false → `notFound()`; `WorkNotFoundError` → `notFound()`. Shows poster, title (+ original), year, cinema badge ("Nos cinemas" / "Em breve nos cinemas · dd/mm/aaaa") from `cinemaStatus(work, today in America/Sao_Paulo)`, overview (with "Sinopse em inglês" label when `overviewLang === 'en'`, or "Sinopse indisponível"), people ("Elenco" / "Autoria"), `<Trailer>`, seasons list for series, `<AvailabilityList>`. If `stale`, small note "Dados podem estar desatualizados". Page sets `<title>` to `"{title} · Lobby"`.
- `AvailabilityList`: for movie/series, heading "Onde assistir", groups by type with labels `subscription` "Assinatura", `free` "Grátis", `ads` "Grátis com anúncios", `rent` "Alugar", `buy` "Comprar"; shows "Dados de streaming: JustWatch" linking to `https://www.justwatch.com/br`; empty → "Ainda não disponível em streaming no Brasil" (still no JustWatch credit needed). For books, heading "Onde comprar", links open in new tab with `rel="noopener noreferrer"`.
- `Trailer`: null → renders nothing; else `<iframe src="https://www.youtube-nocookie.com/embed/{key}" title="Trailer" loading="lazy">`.

- [ ] **Step 1: Write the failing tests:**
  - `kind`: `kindFromSlug('serie') === 'series'`, `kindFromSlug('podcast') === null`, `workPath('book','OL1W') === '/obra/livro/OL1W'`, `isValidExternalId('movie','abc') === false`, `isValidExternalId('book','OL45804W') === true`, `isValidExternalId('book','603') === false`.
  - `search`: `"a"` → no fetcher calls; TMDB rejecting → `unavailable` is `['tmdb']` and book hits still returned; both ok → TMDB hits before book hits.
  - `AvailabilityList`: movie with subscription item → shows "Assinatura" and "Dados de streaming: JustWatch"; movie with `[]` → shows "Ainda não disponível em streaming no Brasil"; book → heading "Onde comprar", link has `target="_blank"`.
  - `Trailer`: `null` renders empty container; key `"abc"` → iframe src ends with `/embed/abc`.
- [ ] **Step 2:** Run `npm test` → new tests FAIL.
- [ ] **Step 3:** Implement modules, components and pages.
- [ ] **Step 4:** Run `npm test && npm run build` → PASS. Manual check with real keys in `.env.local` and `npm run dev`: `/busca?q=matrix` lists movies; `/obra/filme/603` shows "Matrix" with "Onde assistir"; `/obra/serie/1399` shows seasons; `/busca?q=dom casmurro` lists a book and its page shows "Onde comprar"; `/obra/filme/abc` and `/obra/podcast/1` show 404.
- [ ] **Step 5:** Commit `feat: unified search and work pages`.

---

## Done when

- `npm test`, `npm run lint` and `npm run build` pass.
- Migration applies cleanly on a fresh database.
- The manual checks in Task 6 Step 4 pass with real API keys.
- No `@vercel/*` dependency in `package.json`; `next.config.ts` has `images.unoptimized: true`.
