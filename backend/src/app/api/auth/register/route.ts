import "@/modules/auth/auth.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest } from "@/modules/shared/request-context";
import { parseJsonBody } from "@/modules/shared/validate";
import { buildRefreshCookie } from "@/modules/shared/cookie";
import { RegisterBodySchema } from "@/modules/auth/auth.schemas";
import { register } from "@/modules/auth/auth.service";

export const POST = withErrorHandling(
  withRequest(async (req: Request) => {
    const body = await parseJsonBody(req, RegisterBodySchema);
    const { authResponse, refreshToken } = await register(body);

    const res = NextResponse.json(authResponse, { status: 201 });
    res.headers.set("Set-Cookie", buildRefreshCookie(refreshToken));
    return res;
  }),
);
