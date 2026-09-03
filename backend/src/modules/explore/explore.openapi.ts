import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry, CursorPageOfPostsSchema, ErrorResponseSchema } from "@/modules/shared/swagger";

extendZodWithOpenApi(z);

registry.registerPath({
  method: "get",
  path: "/api/explore",
  tags: ["Explore"],
  summary: "Global feed — all posts from all users, newest first (cursor-paginated)",
  request: {
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "Paginated explore feed",
      content: { "application/json": { schema: CursorPageOfPostsSchema } },
    },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});
