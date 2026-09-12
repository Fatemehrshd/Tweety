import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { logger } from "./logger";
import { getRequestId } from "./request-context";

type AnyHandler = (...args: any[]) => Promise<Response> | Response;

/**
 * Wrap a Next.js route handler so any thrown AppError or unexpected error
 * is converted to a JSON response with the correct status. Centralises error
 * translation — controllers stay small.
 *
 * Also emits one pino-http-style access-log line per response (method, url,
 * statusCode, duration, requestId). Next.js App Router hands route handlers
 * Web `Request`/`Response` objects, not Node req/res, so the actual pino-http
 * middleware cannot be mounted here; this produces its output instead.
 */
export function withErrorHandling(handler: AnyHandler): AnyHandler {
  return async (...args) => {
    const req = args[0] as Request;
    // The ALS context is gone by the time the response/error is handled here,
    // so prefer the ID the edge middleware stamped on the request itself.
    const requestId = req?.headers?.get("x-request-id") ?? getRequestId();
    const startedAt = performance.now();
    let res: Response;
    try {
      res = await handler(...args);
    } catch (err) {
      res = errorResponse(err, requestId);
    }
    logAccess(req, res, requestId, Math.round(performance.now() - startedAt));
    return res;
  };
}

function logAccess(req: Request, res: Response, requestId: string | undefined, responseTime: number): void {
  const status = res.status;
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  logger[level](
    {
      requestId,
      req: { id: requestId, method: req.method, url: req.url },
      res: { statusCode: status },
      responseTime,
    },
    "request completed",
  );
}

export function errorResponse(err: unknown, requestId = getRequestId()): NextResponse {

  if (err instanceof AppError) {
    logger.warn(
      { err: err.message, code: err.code, status: err.statusCode, details: err.details, requestId },
      "app_error",
    );
    return NextResponse.json(
      {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
        requestId,
      },
      { status: err.statusCode },
    );
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error({ err: message, stack, requestId }, "unhandled_error");
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "Internal server error", requestId },
    { status: 500 },
  );
}
