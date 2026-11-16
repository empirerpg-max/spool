import type { WorkKind } from '@/lib/catalog/types';

/** A person as shown on cards: photo, name and @. */
export type Person = { id: string; username: string; displayName: string | null; avatarUrl: string | null };

/** The work a post talks about. */
export type PostWork = { id: string; kind: WorkKind; externalId: string; title: string; posterUrl: string | null; year: number | null };

export type SocialPost = {
  id: string;
  author: Person;
  work: PostWork;
  caption: string;
  hasSpoiler: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  likedByMe: boolean;
  isMine: boolean;
};

export type SocialReply = { id: string; body: string; hasSpoiler: boolean; createdAt: string; author: Person; isMine: boolean };

/** One entry of the timeline, ready to show. */
export type TimelineEntry =
  | { type: 'post'; key: string; createdAt: string; post: SocialPost }
  | { type: 'review'; key: string; createdAt: string; actor: Person; work: Omit<PostWork, 'id'>; href: string; hasSpoiler: boolean }
  | { type: 'reply'; key: string; createdAt: string; actor: Person; conversation: string; href: string; body: string; hasSpoiler: boolean };

/** Someone to follow (empty timeline). */
export type SuggestedPerson = Person & { recentPosts: number };

/** A work whose community moved this week (empty timeline). */
export type ActiveCommunity = { work: Omit<PostWork, 'id'>; topics: number; posts: number };
