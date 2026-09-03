import "@/modules/posts/posts.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest, requireAuth } from "@/modules/shared/request-context";
import { parseJsonBody, parseParams } from "@/modules/shared/validate";
import { PostIdParamSchema, UpdatePostBodySchema } from "@/modules/posts/posts.schemas";
import { getPost, editPost, removePost } from "@/modules/posts/posts.service";

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(
  withRequest(async (_req: Request, { params }: RouteCtx) => {
    const { id } = parseParams(await params, PostIdParamSchema);
    const post = await getPost(id);
    return NextResponse.json(post);
  }),
);

export const PATCH = withErrorHandling(
  withRequest(async (req: Request, { params }: RouteCtx) => {
    const { userId } = requireAuth();
    const { id } = parseParams(await params, PostIdParamSchema);
    const { text } = await parseJsonBody(req, UpdatePostBodySchema);
    const post = await editPost(id, userId, text);
    return NextResponse.json(post);
  }),
);

export const DELETE = withErrorHandling(
  withRequest(async (_req: Request, { params }: RouteCtx) => {
    const { userId } = requireAuth();
    const { id } = parseParams(await params, PostIdParamSchema);
    await removePost(id, userId);
    return new NextResponse(null, { status: 204 });
  }),
);
