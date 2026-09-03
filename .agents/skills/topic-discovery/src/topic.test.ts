import { describe, it, expect } from "vitest";
import {
  normalizeHashtag,
  normalizeHashtags,
  extractHashtags,
  matchHashtags,
  buildReport,
  SkillError,
} from "./topic.js";

const P = (id: string, text: string) => ({ id, text, createdAt: "2026-08-10T00:00:00.000Z" });

describe("normalizeHashtag(s)", () => {
  it("strips # prefix and lowercases", () => {
    expect(normalizeHashtag("#Launch")).toBe("launch");
    expect(normalizeHashtag("##MVP")).toBe("mvp");
    expect(normalizeHashtag("  retro ")).toBe("retro");
  });

  it("dedupes, splits commas, drops blanks", () => {
    expect(normalizeHashtags(["#Launch", "launch,#MVP", " ", ""])).toEqual(["launch", "mvp"]);
  });

  it("rejects empty input", () => {
    expect(() => normalizeHashtags([])).toThrow(SkillError);
    expect(() => normalizeHashtags([" , # "])).toThrow(SkillError);
  });
});

describe("extractHashtags", () => {
  it("finds tokens case-insensitively, unicode-aware", () => {
    expect(extractHashtags("Loving #LaunchDay and #café_time!")).toEqual(
      expect.arrayContaining(["launchday", "café_time"]),
    );
  });

  it("ignores bare # with no token", () => {
    expect(extractHashtags("100% # legit")).toEqual([]);
  });
});

describe("matchHashtags", () => {
  it("matches whole tokens only", () => {
    expect(matchHashtags("I love #art", ["art"])).toEqual(["art"]);
    expect(matchHashtags("I love #artist", ["art"])).toEqual([]);
    expect(matchHashtags("#Launch day #LAUNCH", ["launch"])).toEqual(["launch"]);
  });
});

describe("buildReport", () => {
  it("unions across tags with per-tag counts and per-post hits", () => {
    const r = buildReport(["launch", "mvp"], [
      P("1", "shipping the #mvp #launch today"),
      P("2", "quiet weekend"),
      P("3", "#launch retrospective"),
    ]);
    expect(r.matchMode).toBe("any");
    expect(r.postCount).toBe(2);
    expect(r.perHashtag).toEqual({ launch: 2, mvp: 1 });
    expect(r.posts[0]).toMatchObject({ id: "1", matchedHashtags: ["launch", "mvp"] });
    expect(r.note).toBeNull();
  });

  it("reports empty results explicitly", () => {
    const r = buildReport(["nope"], [P("1", "hello world")]);
    expect(r.postCount).toBe(0);
    expect(r.posts).toEqual([]);
    expect(r.perHashtag).toEqual({ nope: 0 });
    expect(r.note).toMatch(/#nope/);
  });
});
