import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const CreatePostBodySchema = z
  .object({
    text: z.string().min(1).max(280),
  })
  .openapi("CreatePostBody");

export const UpdatePostBodySchema = z
  .object({
    text: z.string().min(1).max(280),
  })
  .openapi("UpdatePostBody");

export const PostIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const CursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePostBody = z.infer<typeof CreatePostBodySchema>;
export type UpdatePostBody = z.infer<typeof UpdatePostBodySchema>;
export type CursorQuery = z.infer<typeof CursorQuerySchema>;
