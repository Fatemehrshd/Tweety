import "@/modules/posts/posts.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest, requireAuth } from "@/modules/shared/request-context";
import { parseJsonBody, parseQuery } from "@/modules/shared/validate";
import { CreatePostBodySchema, CursorQuerySchema } from "@/modules/posts/posts.schemas";
import { createNewPost, getMyPosts } from "@/modules/posts/posts.service";

export const GET = withErrorHandling(
  withRequest(async (req: Request) => {
    const { userId } = requireAuth();
    const { cursor, limit } = parseQuery(req, CursorQuerySchema);
    const page = await getMyPosts(userId, cursor ?? null, limit);
    return NextResponse.json(page);
  }),
);

export const POST = withErrorHandling(
  withRequest(async (req: Request) => {
    const { userId } = requireAuth();
    const { text } = await parseJsonBody(req, CreatePostBodySchema);
    const post = await createNewPost(userId, text);
    return NextResponse.json(post, { status: 201 });
  }),
);
