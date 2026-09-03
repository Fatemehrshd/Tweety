import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { logger } from "./logger";
import { getRequestId } from "./request-context";

type AnyHandler = (...args: any[]) => Promise<Response> | Response;

/**
 * Wrap a Next.js route handler so any thrown AppError or unexpected error
 * is converted to a JSON response with the correct status. Centralises error
 * translation — controllers stay small.
 */
export function withErrorHandling(handler: AnyHandler): AnyHandler {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown): NextResponse {
  const requestId = getRequestId();

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
