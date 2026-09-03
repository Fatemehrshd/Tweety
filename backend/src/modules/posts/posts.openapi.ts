import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import {
  registry,
  PublicPostSchema,
  CursorPageOfPostsSchema,
  ErrorResponseSchema,
} from "@/modules/shared/swagger";
import { CreatePostBodySchema, UpdatePostBodySchema } from "./posts.schemas";

extendZodWithOpenApi(z);

registry.register("CreatePostBody", CreatePostBodySchema);
registry.register("UpdatePostBody", UpdatePostBodySchema);

const tags = ["Posts"];
const bearerAuth = [{ BearerAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/api/posts",
  tags,
  summary: "List own posts (cursor-paginated)",
  security: bearerAuth,
  request: {
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: { description: "Paginated posts", content: { "application/json": { schema: CursorPageOfPostsSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/posts",
  tags,
  summary: "Create a new post",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: CreatePostBodySchema } } } },
  responses: {
    201: { description: "Created post", content: { "application/json": { schema: PublicPostSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/posts/{id}",
  tags,
  summary: "Get a single post",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Post", content: { "application/json": { schema: PublicPostSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/posts/{id}",
  tags,
  summary: "Edit own post",
  security: bearerAuth,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdatePostBodySchema } } },
  },
  responses: {
    200: { description: "Updated post", content: { "application/json": { schema: PublicPostSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/posts/{id}",
  tags,
  summary: "Delete own post",
  security: bearerAuth,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Deleted" },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: ErrorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});
