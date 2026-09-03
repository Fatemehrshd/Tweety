import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, logout, status, withAuth, NotAuthenticatedError } from "./session.js";
import { ApiError } from "./api.js";

const profile = {
  id: "u1",
  email: "a@x.com",
  username: "alice",
  bio: null,
  profilePictureUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function stubFetch(handler: (method: string, path: string, headers: Headers, body: unknown) => Response): {
  calls: { method: string; url: string; headers: Headers; body: unknown }[];
} {
  const calls: { method: string; url: string; headers: Headers; body: unknown }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method: init?.method ?? "GET", url, headers: new Headers(init?.headers), body });
    const u = new URL(url as string);
    return handler(init?.method ?? "GET", u.pathname, new Headers(init?.headers), body);
  });
  return { calls };
}

const json = (data: unknown, status = 200, setCookie?: string): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: setCookie ? { "set-cookie": setCookie } : {},
  });

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("session", () => {
  it("login resolves username to email and stores tokens", async () => {
    const { calls } = stubFetch((method, path) => {
      if (method === "GET") return json(profile);
      return json(
        { accessToken: "tok1", user: profile },
        200,
        "refresh_token=r1; HttpOnly; Path=/api/auth",
      );
    });
    const user = await login("c-login", "alice", "pw");
    expect(user.username).toBe("alice");
    expect(status("c-login").authenticated).toBe(true);
    // Profile lookup first, then login with the resolved email.
    expect(calls[0]!.url).toContain("/api/users/alice");
    expect(calls[1]!.body).toEqual({ email: "a@x.com", password: "pw" });
  });

  it("login with unknown username propagates the 404 and stores nothing", async () => {
    stubFetch(() => json({ code: "NOT_FOUND", message: "User not found" }, 404));
    await expect(login("c-unknown", "nobody", "pw")).rejects.toMatchObject({ statusCode: 404 });
    expect(status("c-unknown").authenticated).toBe(false);
  });

  it("withAuth refreshes once on 401 and retries with the new token", async () => {
    const seen: (string | null)[] = [];
    stubFetch((method, path, headers) => {
      if (method === "GET" && path === "/api/users/alice") return json(profile);
      if (method === "POST" && path === "/api/auth/login")
        return json({ accessToken: "old", user: profile }, 200, "refresh_token=r1; HttpOnly; Path=/api/auth");
      if (method === "POST" && path === "/api/auth/refresh")
        return json({ accessToken: "new", user: profile }, 200, "refresh_token=r2; HttpOnly; Path=/api/auth");
      seen.push(headers.get("authorization"));
      if (path === "/api/posts") {
        if (headers.get("authorization") === "Bearer old")
          return json({ code: "AUTH_ERROR", message: "expired" }, 401);
        return json({ items: [], nextCursor: null });
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    await login("c-refresh", "alice", "pw");
    const page = await withAuth("c-refresh", (token) =>
      fetch(`http://x/api/posts`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (!r.ok) throw new ApiError(r.status, "AUTH_ERROR", "expired");
        return r.json();
      }),
    );
    expect(page).toEqual({ items: [], nextCursor: null });
    expect(seen).toEqual(["Bearer old", "Bearer new"]);
  });

  it("failed refresh clears the session", async () => {
    stubFetch((method, path) => {
      if (method === "GET") return json(profile);
      if (path === "/api/auth/login")
        return json({ accessToken: "old", user: profile }, 200, "refresh_token=r1; HttpOnly; Path=/api/auth");
      return json({ code: "AUTH_ERROR", message: "bad refresh" }, 401);
    });
    await login("c-badrefresh", "alice", "pw");
    await expect(
      withAuth("c-badrefresh", async () => {
        throw new ApiError(401, "AUTH_ERROR", "expired");
      }),
    ).rejects.toBeInstanceOf(NotAuthenticatedError);
    expect(status("c-badrefresh").authenticated).toBe(false);
  });

  it("non-401 errors pass through without refresh", async () => {
    let refreshCalls = 0;
    stubFetch((method, path) => {
      if (method === "GET") return json(profile);
      if (path === "/api/auth/login")
        return json({ accessToken: "t", user: profile }, 200, "refresh_token=r1; HttpOnly; Path=/api/auth");
      if (path === "/api/auth/refresh") {
        refreshCalls += 1;
        return json({});
      }
      throw new Error("unreachable");
    });
    await login("c-passthrough", "alice", "pw");
    await expect(
      withAuth("c-passthrough", async () => {
        throw new ApiError(403, "FORBIDDEN", "nope");
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(refreshCalls).toBe(0);
    expect(status("c-passthrough").authenticated).toBe(true);
  });

  it("logout clears the session even when the backend call fails", async () => {
    const { calls } = stubFetch((method, path) => {
      if (method === "GET") return json(profile);
      if (path === "/api/auth/login")
        return json({ accessToken: "t", user: profile }, 200, "refresh_token=r1; HttpOnly; Path=/api/auth");
      throw new TypeError("backend down");
    });
    await login("c-logout", "alice", "pw");
    await logout("c-logout");
    expect(status("c-logout").authenticated).toBe(false);
    expect(calls.some((c) => c.url.endsWith("/api/auth/logout"))).toBe(true);
  });

  it("withAuth without login throws NotAuthenticatedError", async () => {
    await expect(withAuth("c-none", async () => ({}))).rejects.toBeInstanceOf(NotAuthenticatedError);
  });
});
