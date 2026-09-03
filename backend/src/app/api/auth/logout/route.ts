import "@/modules/auth/auth.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest } from "@/modules/shared/request-context";
import { getRefreshCookie, buildClearRefreshCookie } from "@/modules/shared/cookie";
import { logout } from "@/modules/auth/auth.service";

export const POST = withErrorHandling(
  withRequest(async (req: Request) => {
    const token = getRefreshCookie(req);
    if (token) await logout(token);

    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Set-Cookie", buildClearRefreshCookie());
    return res;
  }),
);
