/**
 * Pure hashtag logic for the topic-discovery skill: normalization, matching,
 * and report building. No I/O, no MCP, no secrets — fully unit-testable.
 *
 * Match semantics: a post matches if its text contains ANY of the requested
 * hashtags (union). Matching is case-insensitive and token-based, so #art
 * does not match #artist.
 */

export class SkillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillError";
  }
}

export interface PostLike {
  id: string;
  text: string;
  createdAt: string;
}

export interface MatchedPost extends PostLike {
  matchedHashtags: string[];
}

export interface DiscoveryReport {
  hashtags: string[];
  matchMode: "any";
  postCount: number;
  perHashtag: Record<string, number>;
  posts: MatchedPost[];
  note: string | null;
}

/** Normalize one raw tag: strip leading #'s/whitespace, lowercase. Empty if blank. */
export function normalizeHashtag(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

/** Normalize a raw input list (comma-separated and/or repeated): dedupe, drop blanks. */
export function normalizeHashtags(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const chunk of raw) {
    for (const part of chunk.split(",")) {
      const tag = normalizeHashtag(part);
      if (tag) seen.add(tag);
    }
  }
  const tags = [...seen];
  if (tags.length === 0) {
    throw new SkillError("At least one hashtag is required (e.g. --hashtag launch or --hashtag #launch,#mvp).");
  }
  return tags;
}

/** Extract hashtag tokens from post text, normalized. */
export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_]+)/gu)) {
    const tag = m[1]!.toLowerCase();
    if (tag) tags.add(tag);
  }
  return [...tags];
}

/** Matching requested tags present in the text (normalized, token-based). */
export function matchHashtags(text: string, wanted: string[]): string[] {
  const present = new Set(extractHashtags(text));
  return wanted.filter((t) => present.has(t));
}

export function buildReport(hashtags: string[], posts: PostLike[]): DiscoveryReport {
  const perHashtag: Record<string, number> = Object.fromEntries(hashtags.map((t) => [t, 0]));
  const matched: MatchedPost[] = [];

  for (const p of posts) {
    const hits = matchHashtags(p.text, hashtags);
    if (hits.length === 0) continue;
    for (const h of hits) perHashtag[h] = (perHashtag[h] ?? 0) + 1;
    matched.push({ ...p, matchedHashtags: hits });
  }

  return {
    hashtags,
    matchMode: "any",
    postCount: matched.length,
    perHashtag,
    posts: matched,
    note: matched.length === 0 ? `No posts found containing ${hashtags.map((t) => `#${t}`).join(", ")}.` : null,
  };
}
