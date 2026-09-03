/**
 * Runner tests with an in-memory MCP double. Proves publishing goes through
 * MCP tools only and secrets never surface in results or errors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runPublisher, type McpCaller } from "./runner.js";
import { SkillError } from "./errors.js";

function callerDouble(opts: { loginError?: string; failCreate?: (text: string) => string | null } = {}): {
  caller: McpCaller;
  calls: { name: string; args: Record<string, unknown> }[];
} {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  let n = 0;
  return {
    calls,
    caller: {
      async callTool(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        if (name === "auth_login") {
          if (opts.loginError) return { isError: true, text: opts.loginError };
          return { text: JSON.stringify({ username: "alice" }) };
        }
        if (name === "posts_create") {
          const reason = opts.failCreate?.(args["text"] as string) ?? null;
          if (reason) return { isError: true, text: reason };
          n += 1;
          return { text: JSON.stringify({ id: `id-${n}` }) };
        }
        throw new Error(`unexpected tool ${name}`);
      },
    },
  };
}

function writePosts(data: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pp-"));
  const file = path.join(dir, "posts.json");
  writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data));
  return file;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("runPublisher", () => {
  it("logs in once, then publishes each valid post in order", async () => {
    const { caller, calls } = callerDouble();
    const file = writePosts({ posts: [{ text: "one" }, { text: "two" }] });
    const report = await runPublisher(caller, { file, username: "alice", password: "s3cret" });
    expect(calls.map((c) => c.name)).toEqual(["auth_login", "posts_create", "posts_create"]);
    expect(report).toMatchObject({
      file,
      total: 2,
      published: [
        { index: 0, id: "id-1", text: "one" },
        { index: 1, id: "id-2", text: "two" },
      ],
      skipped: [],
      note: null,
    });
    expect(JSON.stringify(report)).not.toContain("s3cret");
  });

  it("records invalid items as skips and keeps publishing the rest", async () => {
    const { caller } = callerDouble();
    const file = writePosts({ posts: [{ text: "ok" }, { text: "" }, { text: "also ok" }] });
    const report = await runPublisher(caller, { file, username: "alice", password: "pw" });
    expect(report.published.map((p) => p.index)).toEqual([0, 2]);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0]!.index).toBe(1);
  });

  it("records per-post tool failures and continues", async () => {
    const { caller } = callerDouble({ failCreate: (t) => (t === "bad" ? "Error (VALIDATION_ERROR): rejected" : null) });
    const file = writePosts({ posts: [{ text: "good" }, { text: "bad" }] });
    const report = await runPublisher(caller, { file, username: "alice", password: "pw" });
    expect(report.published).toHaveLength(1);
    expect(report.skipped[0]).toMatchObject({ index: 1, text: "bad" });
  });

  it("reports empty files explicitly", async () => {
    const { caller, calls } = callerDouble();
    const file = writePosts({ posts: [] });
    const report = await runPublisher(caller, { file, username: "alice", password: "pw" });
    expect(report.total).toBe(0);
    expect(report.note).toMatch(/nothing to publish/);
    expect(calls.map((c) => c.name)).toEqual(["auth_login"]);
  });

  it("surfaces login failure without leaking the password", async () => {
    const { caller } = callerDouble({ loginError: "Invalid email or password" });
    const file = writePosts({ posts: [{ text: "x" }] });
    const err = await runPublisher(caller, { file, username: "alice", password: "s3cret" }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(SkillError);
    expect((err as Error).message).not.toContain("s3cret");
  });

  it("never touches REST: stubbed fetch is never called", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("must not use fetch");
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const { caller } = callerDouble();
      const file = writePosts({ posts: [{ text: "x" }] });
      await runPublisher(caller, { file, username: "alice", password: "pw" });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
