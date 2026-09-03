import { AsyncLocalStorage } from "node:async_hooks";
import { extractBearer, verifyAccessToken } from "./jwt";

export interface RequestContext {
  requestId: string;
  userId?: string;
  username?: string;
  email?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

export function getUserId(): string | undefined {
  return requestContextStorage.getStore()?.userId;
}

/**
 * Build the context for this request: propagates the request ID (already set
 * by middleware in `x-request-id`) and, if a valid access token is present,
 * attaches the user identity.
 */
function buildContext(req: Request): RequestContext {
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const ctx: RequestContext = { requestId };

  const bearer = extractBearer(req);
  if (bearer) {
    try {
      const payload = verifyAccessToken(bearer);
      ctx.userId = payload.sub;
      ctx.email = payload.email;
      ctx.username = payload.username;
    } catch {
      // Invalid token — leave ctx without user. Endpoints that require auth
      // call `requireAuth()` and will get an explicit AuthError.
    }
  }

  return ctx;
}

/**
 * Outer wrapper that sets up the AsyncLocalStorage context for the request.
 * Must wrap the actual handler; withErrorHandling should wrap this so the
 * context is active when errors are translated to responses.
 */
export function withRequest<Args extends any[]>(
  handler: (...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const req = args[0] as Request;
    const ctx = buildContext(req);
    return requestContextStorage.run(ctx, () => handler(...args));
  };
}

import { AuthError } from "./errors";

/** Throws AuthError unless the request carries a valid access token. */
export function requireAuth(): { userId: string; username: string; email: string } {
  const ctx = requestContextStorage.getStore();
  if (!ctx?.userId || !ctx.username || !ctx.email) {
    throw new AuthError();
  }
  return { userId: ctx.userId, username: ctx.username, email: ctx.email };
}
