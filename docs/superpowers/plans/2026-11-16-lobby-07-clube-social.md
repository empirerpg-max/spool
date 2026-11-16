# Lobby — Plano 7: Clube social (Etapa 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Members get public-to-members profiles (photo, bio, optional display name, optional public list), follow each other one-way, block or mute, publish posts that always cite a work (caption, spoiler flag, likes, replies), follow conversations, get social alerts in the bell, and read a timeline.

**Architecture:** New tables `follows`, `blocks`, `mutes`, `social_posts`, `social_replies`, `social_likes`, `watches` (followed conversations) and `activity` (social alerts), all with RLS; block rules enforced in the database through `is_blocked(a, b)`; moderation reuses `check_can_write`, `has_blocked_link`, rate limits and extends `reports`/`resolve_report`. The timeline is a single SQL function computed on read. Avatars go to a Supabase Storage bucket through a server action.

**Tech Stack:** Next.js 15 · Supabase Postgres + Storage · zod · Vitest + Postgres harness.

**Spec:** `docs/superpowers/specs/2026-11-16-lobby-clube-social-design.md` (Etapa 1).

## Global Constraints
- Profiles, posts, replies, likes, follows and timeline: **members only** (authenticated). Anonymous visitors get 404/redirect to sign-in.
- Profile URL `/@username` (rewrite to `/perfil/[username]`).
- Caption 1–1000 chars, reply 1–2000, bio ≤ 160, display name ≤ 50.
- Block: blocked↔blocker can't see each other's profile/posts/replies, can't follow, reply or like each other's content; existing follows both ways removed on block. Not applied inside work communities (topics). Nobody is told.
- Mute: muted person's posts/replies disappear from the muter's timeline and activity; nothing else changes.
- Public list shows only works + state, never ratings or reviews.
- Social alerts: `follow`, `like`, `reply` (reply to my post), `watched_reply` (new reply in a conversation I follow); grouped in the UI by kind+target.
- pt-BR plain copy.

## Review Focus
1. A blocked person opens the blocker's profile URL directly or calls the API → nothing visible, cannot like/reply/follow. (Task 1)
2. Someone likes the same post twice or likes then unlikes quickly → count stays correct. (Task 1)
3. A removed (moderated) post → disappears from profile, timeline and community tab; replies blocked. (Task 1)
4. Timeline for someone following nobody → suggestions, not an empty page. (Task 6)
5. Uploading a 20 MB or non-image avatar → refused with a clear message. (Task 2)

---

### Task 1: Database
`supabase/migrations/20261121000000_social.sql`, `tests/db/social.test.ts`.
- `profiles` + `bio text check (char_length(bio) <= 160)`, `avatar_url text`, `list_public boolean default false`; column grants: update `(display_name, bio, list_public)` to authenticated (avatar_url set by server); select grants add `bio, avatar_url, list_public` to **authenticated only** (anon keeps the earlier columns).
- `follows(follower uuid, followee uuid, created_at, pk(follower, followee), check follower <> followee)`; `blocks(blocker, blocked, …)`; `mutes(muter, muted, …)`. RLS: follows readable by authenticated when neither side blocked the reader; insert/delete own as follower; blocks/mutes only own rows.
- `is_blocked(a uuid, b uuid) returns boolean` (either direction), security definer.
- Trigger on blocks insert: delete follows both ways.
- `social_posts(id uuid pk, author_id default auth.uid(), work_id references works, caption 1–1000, has_spoiler, like_count int default 0, reply_count int default 0, created_at, deleted_at)`; `social_replies(id, post_id, author_id, body 1–2000, has_spoiler, created_at, deleted_at)`; `social_likes(post_id, user_id, created_at, pk)`.
- RLS select: authenticated, `deleted_at is null or is_admin()`, and `not is_blocked(auth.uid(), author_id)`. Insert: own, via column grants (`work_id, caption, has_spoiler` / `post_id, body, has_spoiler` / `post_id`); replies and likes also require `not is_blocked(auth.uid(), post author)` (trigger `'blocked'`). Reuse triggers: `check_can_write`, `has_blocked_link` (caption/body), rate limit (posts 10/10 min, replies 30/10 min). Counters via triggers (like/unlike, reply insert, moderation removal).
- `watches(user_id, topic_id null, social_post_id null, check one, unique)`; own rows only; auto-watch on creating a topic or post.
- `activity(id bigserial, user_id recipient, kind check in ('follow','like','reply','watched_reply'), actor_id, social_post_id, topic_id, created_at, read_at)`; created by triggers (follow, like, reply on my post, reply/post in watched conversation — topic `posts` too), skipping self, blocked and muted actors; RLS own select; `mark_activity_read()`; `unread_count()` replaced to count notifications + activity.
- `reports` + `social_post_id`, `social_reply_id` (check exactly one of four); `resolve_report` handles them (soft delete, ban).
- `timeline(p_before timestamptz, p_limit int)` returns rows `(item_type 'post'|'review'|'reply', id, created_at, …)`: posts by followed people, review topics (topics whose author is followed and title starts 'Resenha de @'… use `list_items.review_topic_id` join) by followed people, new replies in watched conversations; excluding muted/blocked; ordered desc; security definer filtered by auth.uid().
- `suggested_people(p_limit)`: most active posters last 30 days not followed and not blocked/muted, excluding self.
- `public_list(p_username)`: works + status of a profile whose `list_public` is true and not blocked.

Tests (each Review Focus + rules): follow/unfollow; can't follow self; block removes follows, hides profile fields?/posts/replies both ways, prevents follow/like/reply (`'blocked'` or RLS); mute hides from timeline and activity only; like idempotent and counts; reply count; moderated post hidden + replies refused (`topic_closed`-like `'post_closed'`); anon can't read posts/follows; activity created and grouped inputs; watches auto; timeline order and exclusions; suggestions exclude followed/blocked/self; public_list only when enabled and never exposes rating; reports on posts and resolve_report removes.

### Task 2: Profile editing and avatar
`src/lib/social/profile-schema.ts` (displayName ≤ 50, bio ≤ 160, listPublic checkbox), server actions `updateProfile`, `uploadAvatar` (image/jpeg|png|webp, ≤ 2 MB, resized client-side to 512px square via canvas before upload; server re-checks type/size and stores in bucket `avatars/{userId}.webp` with the service client, sets `avatar_url`), `src/app/minha-conta` sections "Perfil" and "Bloqueados e silenciados". Migration creates the `avatars` bucket (public read) when the `storage` schema exists. Tests: schema; avatar validation function `checkAvatar(file)` rejects > 2 MB and non-images.

### Task 3: Profile page, follow, block, mute
`next.config.ts` rewrite `/@:username` → `/perfil/:username`; `src/app/perfil/[username]/page.tsx` (+ `seguidores`, `seguindo` subpages), `src/components/social/ProfileHeader.tsx`, `FollowButton`, `ProfileMenu` (Bloquear / Silenciar / Denunciar? — report profile out of scope), actions `follow`, `unfollow`, `block`, `unblock`, `mute`, `unmute`. Tabs Publicações / Resenhas / Lista (only if public). Signed out → redirect to sign-in. Blocked → 404. Header links `@username` → own profile. Tests: ProfileHeader renders name/@/bio/counts and buttons states (seguir, seguindo, você bloqueou).

### Task 4: Posts and replies
`src/lib/social/schemas.ts`, `queries.ts`, `actions.ts` (`createPost(workId)`, `replyToPost`, `likePost`, `unlikePost`, `watch`, `unwatch`, report via existing report action extended), components `PostCard` (avatar, name, @, time, work chip with cover and kind tag, caption or Spoiler, ♡ count, 💬 count), `PostComposer` (work picker using catalog search; also "Publicar sobre esta obra" button on work pages), `src/app/p/[id]/page.tsx` (post + replies + reply form + watch), community tab "Publicações" on the work page. Tests: schemas; PostCard (spoiler hidden, counts, work link); composer requires a work.

### Task 5: Social alerts in the bell
Bell counts notifications + activity; `/avisos` shows two sections or a merged list with grouping ("@ana e mais 3 curtiram sua publicação sobre Matrix"); marks both read. Pure `groupActivity(rows)` tested.

### Task 6: Timeline
`src/app/timeline/page.tsx` (temporary home for the feed until Etapa 2), infinite "Carregar mais" via `p_before`; empty state shows `suggested_people` with follow buttons + top communities of the week. Header link "Timeline". Tests: TimelineItem variants and empty state.

### Task 7: Docs
`docs/setup-chaves.md`: nothing to configure if the Storage bucket is created by the migration; otherwise steps to create bucket `avatars` (public) in Supabase → Storage.
