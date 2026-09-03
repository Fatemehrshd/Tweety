/**
 * Authenticated sessions, keyed by MCP client.
 * stdio serves exactly one client ("stdio"); Streamable HTTP gets one entry
 * per MCP session id, so concurrent HTTP clients never share tokens.
 * Sessions stay in process memory and are never returned to the agent or logged.
 */
import { apiCall, ApiError, type AuthResponse, type PublicUser } from "./api.js";

interface Session {
  accessToken: string;
  refreshCookie: string | null;
  user: PublicUser;
}

const sessions = new Map<string, Session>();

/** Client key for the single stdio connection. */
export const STDIO_CLIENT_ID = "stdio";

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated. Call auth_login with your username and password first.");
    this.name = "NotAuthenticatedError";
  }
}

export async function login(clientId: string, username: string, password: string): Promise<PublicUser> {
  // The login endpoint takes an email; the public profile maps username -> email.
  const profile = await apiCall<PublicUser>("GET", `/api/users/${encodeURIComponent(username)}`);
  const res = await apiCall<AuthResponse>("POST", "/api/auth/login", {
    body: { email: profile.data.email, password },
  });
  sessions.set(clientId, {
    accessToken: res.data.accessToken,
    refreshCookie: res.refreshCookie,
    user: res.data.user,
  });
  return res.data.user;
}

export async function logout(clientId: string): Promise<void> {
  const session = sessions.get(clientId);
  if (session?.refreshCookie) {
    // Best-effort server-side invalidation; local state clears regardless.
    try {
      await apiCall("POST", "/api/auth/logout", { cookie: session.refreshCookie });
    } catch {
      // Session still ends locally — nothing to do.
    }
  }
  sessions.delete(clientId);
}

/** Drop a client's session without contacting the backend (transport closed). */
export function clearSession(clientId: string): void {
  sessions.delete(clientId);
}

export function status(clientId: string): { authenticated: boolean; user: PublicUser | null } {
  const session = sessions.get(clientId);
  return { authenticated: session !== undefined, user: session?.user ?? null };
}

async function refresh(clientId: string): Promise<void> {
  const session = sessions.get(clientId);
  if (!session?.refreshCookie) {
    sessions.delete(clientId);
    throw new NotAuthenticatedError();
  }
  try {
    const res = await apiCall<AuthResponse>("POST", "/api/auth/refresh", {
      cookie: session.refreshCookie,
    });
    sessions.set(clientId, {
      accessToken: res.data.accessToken,
      refreshCookie: res.refreshCookie ?? session.refreshCookie,
      user: res.data.user,
    });
  } catch {
    sessions.delete(clientId);
    throw new NotAuthenticatedError();
  }
}

/**
 * Run an authenticated call, refreshing once on 401 before giving up.
 * Exactly one refresh attempt — never unbounded retries.
 */
export async function withAuth<T>(clientId: string, fn: (token: string) => Promise<T>): Promise<T> {
  const session = sessions.get(clientId);
  if (!session) throw new NotAuthenticatedError();
  try {
    return await fn(session.accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      await refresh(clientId);
      const retry = sessions.get(clientId);
      if (!retry) throw new NotAuthenticatedError();
      return fn(retry.accessToken);
    }
    throw err;
  }
}
