/**
 * Authenticated session for the single MCP client (stdio = one client).
 * Login reuses the existing application flow: username -> public profile
 * (for the email) -> POST /api/auth/login. Tokens stay in process memory
 * and are never returned to the agent or logged.
 */
import { apiCall, ApiError, type AuthResponse, type PublicUser } from "./api.js";

interface Session {
  accessToken: string;
  refreshCookie: string | null;
  user: PublicUser;
}

let session: Session | null = null;

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated. Call auth_login with your username and password first.");
    this.name = "NotAuthenticatedError";
  }
}

export async function login(username: string, password: string): Promise<PublicUser> {
  // The login endpoint takes an email; the public profile maps username -> email.
  const profile = await apiCall<PublicUser>("GET", `/api/users/${encodeURIComponent(username)}`);
  const res = await apiCall<AuthResponse>("POST", "/api/auth/login", {
    body: { email: profile.data.email, password },
  });
  session = {
    accessToken: res.data.accessToken,
    refreshCookie: res.refreshCookie,
    user: res.data.user,
  };
  return session.user;
}

export async function logout(): Promise<void> {
  if (session?.refreshCookie) {
    // Best-effort server-side invalidation; local state clears regardless.
    try {
      await apiCall("POST", "/api/auth/logout", { cookie: session.refreshCookie });
    } catch {
      // Session still ends locally — nothing to do.
    }
  }
  session = null;
}

export function status(): { authenticated: boolean; user: PublicUser | null } {
  return { authenticated: session !== null, user: session?.user ?? null };
}

async function refresh(): Promise<void> {
  if (!session?.refreshCookie) {
    session = null;
    throw new NotAuthenticatedError();
  }
  try {
    const res = await apiCall<AuthResponse>("POST", "/api/auth/refresh", {
      cookie: session.refreshCookie,
    });
    session = {
      accessToken: res.data.accessToken,
      refreshCookie: res.refreshCookie ?? session.refreshCookie,
      user: res.data.user,
    };
  } catch {
    session = null;
    throw new NotAuthenticatedError();
  }
}

/**
 * Run an authenticated call, refreshing once on 401 before giving up.
 * Exactly one refresh attempt — never unbounded retries.
 */
export async function withAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
  if (!session) throw new NotAuthenticatedError();
  try {
    return await fn(session.accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      await refresh();
      if (!session) throw new NotAuthenticatedError();
      return fn(session.accessToken);
    }
    throw err;
  }
}
