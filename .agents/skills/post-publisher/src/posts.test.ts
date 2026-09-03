import { describe, it, expect } from "vitest";
import { parsePostsJson, readPostsFile, MAX_ITEMS } from "./posts.js";
import { SkillError } from "./errors.js";

describe("parsePostsJson", () => {
  it("accepts the object shape and the bare array shape", () => {
    const a = parsePostsJson(JSON.stringify({ posts: [{ text: "hi" }] }));
    expect(a.valid).toEqual([{ index: 0, text: "hi" }]);
    expect(a.total).toBe(1);
    const b = parsePostsJson(JSON.stringify([{ text: "hi" }]));
    expect(b.valid).toEqual([{ index: 0, text: "hi" }]);
  });

  it("reports invalid items as skips while keeping valid ones", () => {
    const r = parsePostsJson(
      JSON.stringify({ posts: [{ text: "ok" }, { text: "" }, { txt: "typo" }, { text: "x".repeat(281) }] }),
    );
    expect(r.valid.map((v) => v.index)).toEqual([0]);
    expect(r.invalid.map((i) => i.index)).toEqual([1, 2, 3]);
    expect(r.total).toBe(4);
  });

  it("rejects malformed JSON and wrong shapes", () => {
    expect(() => parsePostsJson("{nope")).toThrow(SkillError);
    expect(() => parsePostsJson(JSON.stringify({ posts: "nope" }))).toThrow(/invalid shape/);
    expect(() => parsePostsJson(JSON.stringify({ nothing: [] }))).toThrow(/invalid shape/);
  });

  it("rejects files over the item limit", () => {
    const many = { posts: Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ text: `p${i}` })) };
    expect(() => parsePostsJson(JSON.stringify(many))).toThrow(/limit/);
  });

  it("accepts an empty list", () => {
    const r = parsePostsJson(JSON.stringify({ posts: [] }));
    expect(r).toEqual({ valid: [], invalid: [], total: 0 });
  });
});

describe("readPostsFile", () => {
  it("fails clearly on missing files", () => {
    expect(() => readPostsFile("/does/not/exist.json")).toThrow(/Cannot read/);
  });
});
