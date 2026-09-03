import "@/modules/users/users.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest } from "@/modules/shared/request-context";
import { parseParams, parseQuery } from "@/modules/shared/validate";
import { UsernameParamSchema } from "@/modules/users/users.schemas";
import { CursorQuerySchema } from "@/modules/posts/posts.schemas";
import { getPostsByUsername } from "@/modules/users/users.service";

export const GET = withErrorHandling(
  withRequest(async (req: Request, { params }: { params: Promise<{ username: string }> }) => {
    const { username } = parseParams(await params, UsernameParamSchema);
    const { cursor, limit } = parseQuery(req, CursorQuerySchema);
    const page = await getPostsByUsername(username, cursor ?? null, limit);
    return NextResponse.json(page);
  }),
);
