/**
 * Runner tests with an in-memory MCP double. Proves discovery goes through
 * MCP tools only and secrets never surface in results or errors.
 */
import { describe, it, expect, vi } from "vitest";
import { runDiscovery, type McpCaller } from "./runner.js";
import { SkillError } from "./topic.js";

function callerDouble(pages: { items: unknown[]; nextCursor: string | null }[], loginError?: string): {
  caller: McpCaller;
  calls: { name: string; args: Record<string, unknown> }[];
} {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  let page = 0;
  return {
    calls,
    caller: {
      async callTool(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        if (name === "auth_login") {
          if (loginError) return { isError: true, text: loginError };
          return { text: JSON.stringify({ username: "alice" }) };
        }
        if (name === "posts_list_mine") {
          const p = pages[Math.min(page++, pages.length - 1)]!;
          return { text: JSON.stringify(p) };
        }
        throw new Error(`unexpected tool ${name}`);
      },
    },
  };
}

const post = (id: string, text: string) => ({ id, text, createdAt: "2026-08-10T00:00:00.000Z" });

describe("runDiscovery", () => {
  it("logs in, paginates, and reports hashtag matches", async () => {
    const { caller, calls } = callerDouble([
      { items: [post("1", "loving the #launch")], nextCursor: "c1" },
      { items: [post("2", "no tags here")], nextCursor: null },
    ]);
    const report = await runDiscovery(caller, {
      username: "alice",
      password: "s3cret",
      hashtags: ["#Launch"],
    });
    expect(calls.map((c) => c.name)).toEqual(["auth_login", "posts_list_mine", "posts_list_mine"]);
    expect(report.hashtags).toEqual(["launch"]);
    expect(report.postCount).toBe(1);
    expect(report.posts[0]).toMatchObject({ id: "1", matchedHashtags: ["launch"] });
    expect(JSON.stringify(report)).not.toContain("s3cret");
  });

  it("supports multiple tags across comma and repeated inputs", async () => {
    const { caller } = callerDouble([
      { items: [post("1", "#mvp shipped"), post("2", "#launch day")], nextCursor: null },
    ]);
    const report = await runDiscovery(caller, {
      username: "alice",
      password: "pw",
      hashtags: ["#launch,#mvp"],
    });
    expect(report.postCount).toBe(2);
    expect(report.perHashtag).toEqual({ launch: 1, mvp: 1 });
  });

  it("returns explicit empty results", async () => {
    const { caller } = callerDouble([{ items: [post("1", "plain post")], nextCursor: null }]);
    const report = await runDiscovery(caller, { username: "alice", password: "pw", hashtags: ["nope"] });
    expect(report.postCount).toBe(0);
    expect(report.note).toMatch(/#nope/);
  });

  it("surfaces login failure without leaking the password", async () => {
    const { caller } = callerDouble([], "Invalid email or password");
    const err = await runDiscovery(caller, {
      username: "alice",
      password: "s3cret",
      hashtags: ["x"],
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SkillError);
    expect((err as Error).message).not.toContain("s3cret");
  });

  it("never touches REST: stubbed fetch is never called", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("must not use fetch");
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const { caller } = callerDouble([{ items: [post("1", "#x")], nextCursor: null }]);
      const report = await runDiscovery(caller, {
        username: "alice",
        password: "pw",
        hashtags: ["x"],
      });
      expect(report.postCount).toBe(1);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
