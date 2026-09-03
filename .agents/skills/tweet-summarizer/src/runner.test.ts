/**
 * Runner tests with an in-memory MCP double. Proves the skill flow goes
 * through MCP tools only (login, then paginated posts_list_mine) and that
 * secrets never surface in results or errors.
 */
import { describe, it, expect, vi } from "vitest";
import { runSummarizer, type McpCaller } from "./runner.js";
import { SkillError } from "./report.js";

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

const post = (id: string, createdAt: string) => ({ id, text: `post ${id} with content`, createdAt });

describe("runSummarizer", () => {
  it("logs in, follows pagination, and reports the range", async () => {
    const { caller, calls } = callerDouble([
      { items: [post("1", "2026-08-10T00:00:00.000Z")], nextCursor: "c1" },
      { items: [post("2", "2026-08-20T00:00:00.000Z")], nextCursor: null },
    ]);
    const report = await runSummarizer(caller, {
      username: "alice",
      password: "s3cret",
      start: "2026-08-01",
      end: "2026-08-31",
    });
    expect(calls.map((c) => c.name)).toEqual(["auth_login", "posts_list_mine", "posts_list_mine"]);
    expect(calls[1]!.args).toEqual({ limit: 100 });
    expect(calls[2]!.args).toEqual({ cursor: "c1", limit: 100 });
    expect(report.postCount).toBe(2);
    expect(report.timeRange).toEqual({ start: "2026-08-01", end: "2026-08-31" });
    expect(JSON.stringify(report)).not.toContain("s3cret");
  });

  it("returns an explicit empty report, not an error", async () => {
    const { caller } = callerDouble([{ items: [], nextCursor: null }]);
    const report = await runSummarizer(caller, {
      username: "alice",
      password: "pw",
      start: "2020-01-01",
      end: "2020-01-31",
    });
    expect(report.postCount).toBe(0);
    expect(report.summary.note).toMatch(/No posts/);
  });

  it("fails fast on invalid ranges without calling MCP", async () => {
    const { caller, calls } = callerDouble([{ items: [], nextCursor: null }]);
    await expect(
      runSummarizer(caller, { username: "alice", password: "pw", start: "2026-09-01", end: "2026-08-01" }),
    ).rejects.toBeInstanceOf(SkillError);
    expect(calls).toEqual([]);
  });

  it("surfaces login failure without leaking the password", async () => {
    const { caller } = callerDouble([], "Invalid email or password");
    const err = await runSummarizer(caller, {
      username: "alice",
      password: "s3cret",
      start: "2026-08-01",
      end: "2026-08-31",
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SkillError);
    expect((err as Error).message).not.toContain("s3cret");
  });

  it("requires credentials", async () => {
    const { caller } = callerDouble([]);
    await expect(runSummarizer(caller, { username: "", password: "", start: "2026-08-01", end: "2026-08-31" })).rejects.toThrow(
      /required/,
    );
  });

  it("rejects malformed tool output", async () => {
    const bad: McpCaller = {
      async callTool(name: string) {
        if (name === "auth_login") return { text: "{}" };
        return { text: "not-json" };
      },
    };
    await expect(
      runSummarizer(bad, { username: "a", password: "b", start: "2026-08-01", end: "2026-08-31" }),
    ).rejects.toThrow(/non-JSON/);
  });

  it("never touches REST: stubbed fetch is never called", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("must not use fetch");
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const { caller } = callerDouble([{ items: [post("1", "2026-08-10T00:00:00.000Z")], nextCursor: null }]);
      const report = await runSummarizer(caller, {
        username: "alice",
        password: "pw",
        start: "2026-08-01",
        end: "2026-08-31",
      });
      expect(report.postCount).toBe(1);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
