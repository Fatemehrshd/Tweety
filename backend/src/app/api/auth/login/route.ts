import "@/modules/auth/auth.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest } from "@/modules/shared/request-context";
import { parseJsonBody } from "@/modules/shared/validate";
import { buildRefreshCookie } from "@/modules/shared/cookie";
import { LoginBodySchema } from "@/modules/auth/auth.schemas";
import { login } from "@/modules/auth/auth.service";

export const POST = withErrorHandling(
  withRequest(async (req: Request) => {
    const body = await parseJsonBody(req, LoginBodySchema);
    const { authResponse, refreshToken } = await login(body);

    const res = NextResponse.json(authResponse, { status: 200 });
    res.headers.set("Set-Cookie", buildRefreshCookie(refreshToken));
    return res;
  }),
);
