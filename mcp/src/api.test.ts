import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiCall, ApiError } from "./api.js";

type Handler = (method: string, path: string, headers: Headers, body: unknown) => Response;

function stubFetch(handler: Handler): { calls: { method: string; url: string; headers: Headers; body: unknown }[] } {
  const calls: { method: string; url: string; headers: Headers; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      const headers = new Headers(init?.headers);
      calls.push({ method: init?.method ?? "GET", url, headers, body });
      const u = new URL(url);
      return handler(init?.method ?? "GET", u.pathname + u.search, headers, body);
    },
  );
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

describe("apiCall", () => {
  it("sends bearer token and cookie, returns data + captured refresh cookie", async () => {
    const { calls } = stubFetch(() => json({ ok: true }, 200, "refresh_token=abc123; HttpOnly; Path=/api/auth"));
    const res = await apiCall<{ ok: boolean }>("GET", "/api/users/me", {
      token: "tok",
      cookie: "refresh_token=old",
    });
    expect(res.data).toEqual({ ok: true });
    expect(res.refreshCookie).toBe("refresh_token=abc123");
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer tok");
    expect(calls[0]!.headers.get("cookie")).toBe("refresh_token=old");
  });

  it("maps backend errors to ApiError with code and status", async () => {
    stubFetch(() => json({ code: "FORBIDDEN", message: "Cannot edit another user's post" }, 403));
    await expect(apiCall("PATCH", "/api/posts/1", {})).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    } satisfies Partial<ApiError>);
  });

  it("ignores unrelated set-cookie values", async () => {
    const res = await (async () => {
      stubFetch(() => json({}, 200, "other=1; Path=/"));
      return apiCall("POST", "/api/auth/logout", {});
    })();
    expect(res.refreshCookie).toBeNull();
  });

  it("maps network failure to NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await expect(apiCall("GET", "/x", {})).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("maps abort timeout to TIMEOUT", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    await expect(apiCall("GET", "/x", {})).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});
