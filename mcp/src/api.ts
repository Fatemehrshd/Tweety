/**
 * Thin HTTP client for the existing backend API.
 * No business logic lives here — transport, timeouts, and error mapping only.
 * Response shapes mirror backend/src/modules/shared/api-types.ts (shapes only).
 */

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");
const TIMEOUT_MS = 10_000;
const REFRESH_COOKIE_NAME = "refresh_token";

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  bio: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

export interface PublicPostAuthor {
  id: string;
  username: string;
  profilePictureUrl: string | null;
}

export interface PublicPost {
  id: string;
  text: string;
  author: PublicPostAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResult<T> {
  data: T;
  /** Raw `refresh_token=<value>` pair captured from Set-Cookie, if present. */
  refreshCookie: string | null;
}

function captureRefreshCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  // Set-Cookie may combine attributes; the pair we need is the first segment.
  const first = setCookie.split(",")[0] ?? "";
  const pair = first.split(";")[0]?.trim() ?? "";
  return pair.startsWith(`${REFRESH_COOKIE_NAME}=`) && pair.length > REFRESH_COOKIE_NAME.length + 1
    ? pair
    : null;
}

export interface CallOptions {
  token?: string;
  cookie?: string;
  body?: unknown;
}

export async function apiCall<T>(
  method: string,
  path: string,
  options: CallOptions = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  if (options.cookie) headers["Cookie"] = options.cookie;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError(0, "TIMEOUT", `Backend request timed out after ${TIMEOUT_MS}ms`);
    }
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach backend — is it running?");
  }

  const refreshCookie = captureRefreshCookie(res.headers.get("set-cookie"));

  if (res.status === 204) return { data: undefined as T, refreshCookie };
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    throw new ApiError(res.status, payload.code ?? "UNKNOWN_ERROR", payload.message ?? "Request failed");
  }
  return { data: (await res.json()) as T, refreshCookie };
}
