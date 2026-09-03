import "@/modules/auth/auth.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest } from "@/modules/shared/request-context";
import { getRefreshCookie, buildRefreshCookie } from "@/modules/shared/cookie";
import { AuthError } from "@/modules/shared/errors";
import { refresh } from "@/modules/auth/auth.service";

export const POST = withErrorHandling(
  withRequest(async (req: Request) => {
    const token = getRefreshCookie(req);
    if (!token) throw new AuthError("No refresh token");

    const { authResponse, refreshToken: newRefreshToken } = await refresh(token);

    const res = NextResponse.json(authResponse, { status: 200 });
    res.headers.set("Set-Cookie", buildRefreshCookie(newRefreshToken));
    return res;
  }),
);
