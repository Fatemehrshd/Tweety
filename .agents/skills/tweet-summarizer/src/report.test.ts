import { describe, it, expect } from "vitest";
import {
  validateRange,
  filterPosts,
  summarizePosts,
  buildReport,
  SkillError,
  type PostLike,
} from "./report.js";

const P = (id: string, text: string, createdAt: string): PostLike => ({ id, text, createdAt });

describe("validateRange", () => {
  it("accepts date-only bounds, end day inclusive", () => {
    const { startMs, endMs } = validateRange("2026-08-01", "2026-08-31");
    expect(startMs).toBe(Date.parse("2026-08-01T00:00:00.000Z"));
    expect(endMs).toBe(Date.parse("2026-08-31T23:59:59.999Z"));
  });

  it("accepts full ISO datetimes", () => {
    const { startMs, endMs } = validateRange("2026-08-01T10:00:00Z", "2026-08-01T12:00:00Z");
    expect(endMs - startMs).toBe(2 * 3600 * 1000);
  });

  it("rejects unparseable dates", () => {
    expect(() => validateRange("yesterday", "2026-08-31")).toThrow(SkillError);
    expect(() => validateRange("2026-08-01", "31/08/2026")).toThrow(SkillError);
  });

  it("rejects start after end", () => {
    expect(() => validateRange("2026-09-01", "2026-08-01")).toThrow(/after end/);
  });
});

describe("filterPosts", () => {
  const posts = [
    P("1", "a", "2026-08-01T00:00:00.000Z"),
    P("2", "b", "2026-08-15T12:00:00.000Z"),
    P("3", "c", "2026-08-31T23:59:59.999Z"),
    P("4", "d", "2026-09-01T00:00:00.000Z"),
  ];

  it("keeps boundary posts, drops the rest", () => {
    const { startMs, endMs } = validateRange("2026-08-01", "2026-08-31");
    expect(filterPosts(posts, startMs, endMs).map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("skips posts with unparseable timestamps", () => {
    const { startMs, endMs } = validateRange("2026-01-01", "2026-12-31");
    expect(filterPosts([P("x", "x", "not-a-date")], startMs, endMs)).toEqual([]);
  });
});

describe("summarizePosts", () => {
  it("reports empty results explicitly", () => {
    const s = summarizePosts([]);
    expect(s.note).toMatch(/No posts/);
    expect(s.topTerms).toEqual([]);
    expect(s.longestExcerpt).toBeNull();
  });

  it("computes stats, per-day counts, and top terms without stopwords", () => {
    const s = summarizePosts([
      P("1", "launch day is here and the launch looks great", "2026-08-03T10:00:00.000Z"),
      P("2", "the launch party photos", "2026-08-03T18:00:00.000Z"),
      P("3", "quiet weekend", "2026-08-10T09:00:00.000Z"),
    ]);
    expect(s.perDay).toEqual({ "2026-08-03": 2, "2026-08-10": 1 });
    expect(s.totalChars).toBeGreaterThan(0);
    expect(s.avgLength).toBeCloseTo(s.totalChars / 3, 1);
    expect(s.topTerms[0]).toEqual({ term: "launch", count: 3 });
    expect(s.topTerms.some((t) => ["the", "and", "is"].includes(t.term))).toBe(false);
    expect(s.longestExcerpt).toContain("launch day");
  });

  it("truncates long excerpts", () => {
    const s = summarizePosts([P("1", "x".repeat(200), "2026-08-01T00:00:00.000Z")]);
    expect(s.longestExcerpt!.length).toBeLessThan(200);
    expect(s.longestExcerpt!.endsWith("…")).toBe(true);
  });
});

describe("buildReport", () => {
  it("combines range, count, posts, and summary", () => {
    const r = buildReport("2026-08-01", "2026-08-31", [
      P("1", "in range", "2026-08-15T00:00:00.000Z"),
      P("2", "out of range", "2026-10-01T00:00:00.000Z"),
    ]);
    expect(r.timeRange).toEqual({ start: "2026-08-01", end: "2026-08-31" });
    expect(r.postCount).toBe(1);
    expect(r.posts.map((p) => p.id)).toEqual(["1"]);
    expect(r.summary.note).toBeNull();
  });
});
