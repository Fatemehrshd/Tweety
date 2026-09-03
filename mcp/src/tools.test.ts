/**
 * Protocol-level tests: an in-memory MCP client (the Agent's point of view)
 * drives the real tool wiring with a stubbed backend. Proves the agent can
 * do everything through MCP — including that another user's post cannot be
 * touched (backend 403 propagates as a tool error).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./server.js";

const profile = {
  id: "u1",
  email: "a@x.com",
  username: "alice",
  bio: null,
  profilePictureUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const post = {
  id: "11111111-1111-4111-8111-111111111111",
  text: "hello",
  author: { id: "u1", username: "alice", profilePictureUrl: null },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

interface Seen {
  method: string;
  path: string;
  auth: string | null;
  body: unknown;
}

function stubBackend(handler: (method: string, path: string, headers: Headers, body: unknown) => Response): Seen[] {
  const seen: Seen[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    const headers = new Headers(init?.headers);
    const u = new URL(url as string);
    seen.push({ method: init?.method ?? "GET", path: u.pathname + u.search, auth: headers.get("authorization"), body });
    return handler(init?.method ?? "GET", u.pathname + u.search, headers, body);
  });
  return seen;
}

const json = (data: unknown, status = 200, setCookie?: string): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: setCookie ? { "set-cookie": setCookie } : {},
  });

async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-agent", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), createMcpServer().connect(serverTransport)]);
  return client;
}

type TextContent = { type: "text"; text: string };
async function call(client: Awaited<ReturnType<typeof connect>>, name: string, args: Record<string, unknown>) {
  const res = (await client.callTool({ name, arguments: args })) as {
    content: TextContent[];
    isError?: boolean;
  };
  const text = res.content[0]!.text;
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Error results are plain text, not JSON.
  }
  return { isError: res.isError ?? false, text, json };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("mcp tools (Part 2 surface)", () => {
  it("lists the five Part 2 tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of ["posts_list_mine", "posts_create", "posts_update", "posts_delete", "explore_feed"]) {
      expect(names).toContain(expected);
    }
    await client.close();
  });

  it("agent flow through MCP only: login -> create -> list -> update -> delete", async () => {
    const seen = stubBackend((method, path) => {
      if (method === "GET" && path === "/api/users/alice") return json(profile);
      if (method === "POST" && path === "/api/auth/login")
        return json({ accessToken: "tok", user: profile }, 200, "refresh_token=r; HttpOnly; Path=/api/auth");
      if (method === "POST" && path === "/api/posts") return json(post, 201);
      if (method === "GET" && path.startsWith("/api/posts?")) return json({ items: [post], nextCursor: null });
      if (method === "PATCH") return json({ ...post, text: "edited" });
      if (method === "DELETE") return new Response(null, { status: 204 });
      throw new Error(`unexpected ${method} ${path}`);
    });
    const client = await connect();

    const me = await call(client, "auth_login", { username: "alice", password: "pw" });
    expect(me.isError).toBe(false);

    const created = await call(client, "posts_create", { text: "hello" });
    expect((created.json as typeof post).author.username).toBe("alice");

    const mine = await call(client, "posts_list_mine", { limit: 10 });
    expect(((mine.json as { items: unknown[] }).items)).toHaveLength(1);

    const edited = await call(client, "posts_update", { id: post.id, text: "edited" });
    expect((edited.json as typeof post).text).toBe("edited");

    const removed = await call(client, "posts_delete", { id: post.id });
    expect((removed.json as { deleted: boolean }).deleted).toBe(true);

    // Every post call carried the agent's own bearer token — never direct DB access.
    const authed = seen.filter((s) => s.path.startsWith("/api/posts"));
    expect(authed.length).toBeGreaterThan(0);
    for (const s of authed) expect(s.auth).toBe("Bearer tok");

    await client.close();
  });

  it("cannot update another user's post: backend 403 becomes a tool error", async () => {
    stubBackend((method, path) => {
      if (method === "GET" && path === "/api/users/alice") return json(profile);
      if (method === "POST" && path === "/api/auth/login")
        return json({ accessToken: "tok", user: profile }, 200, "refresh_token=r; HttpOnly; Path=/api/auth");
      return json({ code: "FORBIDDEN", message: "Cannot edit another user's post" }, 403);
    });
    const client = await connect();
    await call(client, "auth_login", { username: "alice", password: "pw" });
    const res = await call(client, "posts_update", {
      id: "22222222-2222-4222-8222-222222222222",
      text: "hijack",
    });
    expect(res.isError).toBe(true);
    expect(res.text).toContain("FORBIDDEN");
    await client.close();
  });

  it("explore_feed passes cursor pagination through", async () => {
    const seen = stubBackend(() => json({ items: [], nextCursor: null }));
    const client = await connect();
    await call(client, "explore_feed", { cursor: "2026-01-01T00:00:00.000Z", limit: 5 });
    expect(seen[0]!.path).toContain("cursor=2026-01-01T00%3A00%3A00.000Z");
    expect(seen[0]!.path).toContain("limit=5");
    await client.close();
  });
});
