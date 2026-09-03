import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry, PublicUserSchema, CursorPageOfPostsSchema, ErrorResponseSchema } from "@/modules/shared/swagger";
import { UpdateProfileBodySchema, ChangePasswordBodySchema } from "./users.schemas";

extendZodWithOpenApi(z);

registry.register("UpdateProfileBody", UpdateProfileBodySchema);
registry.register("ChangePasswordBody", ChangePasswordBodySchema);

const tags = ["Users"];
const bearerAuth = [{ BearerAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/api/users/{username}",
  tags,
  summary: "Get a public user profile by username",
  request: {
    params: z.object({ username: z.string() }),
  },
  responses: {
    200: { description: "User profile", content: { "application/json": { schema: PublicUserSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/{username}/posts",
  tags,
  summary: "List a user's posts by username, newest first (cursor-paginated)",
  request: {
    params: z.object({ username: z.string() }),
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "Paginated user posts",
      content: { "application/json": { schema: CursorPageOfPostsSchema } },
    },
    404: { description: "User not found", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/me",
  tags,
  summary: "Update own profile (bio and/or profile picture URL)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: UpdateProfileBodySchema } } } },
  responses: {
    200: { description: "Updated profile", content: { "application/json": { schema: PublicUserSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/users/me/password",
  tags,
  summary: "Change own password (requires current password)",
  security: bearerAuth,
  request: { body: { content: { "application/json": { schema: ChangePasswordBodySchema } } } },
  responses: {
    200: { description: "Updated profile", content: { "application/json": { schema: PublicUserSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized or wrong current password", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/users/me/profile-picture",
  tags,
  summary: "Upload own profile picture (JPEG/PNG/WebP/GIF, max 5 MB)",
  security: bearerAuth,
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.string().openapi({ type: "string", format: "binary" }),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Updated profile", content: { "application/json": { schema: PublicUserSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/me",
  tags,
  summary: "Get own profile",
  security: bearerAuth,
  responses: {
    200: { description: "Own profile", content: { "application/json": { schema: PublicUserSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});
