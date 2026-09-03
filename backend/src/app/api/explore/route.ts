import "@/modules/explore/explore.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest } from "@/modules/shared/request-context";
import { parseQuery } from "@/modules/shared/validate";
import { CursorQuerySchema } from "@/modules/posts/posts.schemas";
import { getExploreFeed } from "@/modules/explore";

export const GET = withErrorHandling(
  withRequest(async (req: Request) => {
    const { cursor, limit } = parseQuery(req, CursorQuerySchema);
    const page = await getExploreFeed(cursor ?? null, limit);
    return NextResponse.json(page);
  }),
);
