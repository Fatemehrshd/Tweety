import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Single registry — route handlers register their paths/schemas here at module load.
export const registry = new OpenAPIRegistry();

// Reusable schema fragments — registered once, referenced everywhere.
export const ErrorResponseSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  })
  .openapi("ErrorResponse");

export const PublicUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    username: z.string(),
    bio: z.string().nullable(),
    profilePictureUrl: z.string().url().nullable(),
    createdAt: z.string(),
  })
  .openapi("PublicUser");

export const PublicPostAuthorSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string(),
    profilePictureUrl: z.string().url().nullable(),
  })
  .openapi("PublicPostAuthor");

export const PublicPostSchema = z
  .object({
    id: z.string().uuid(),
    text: z.string(),
    author: PublicPostAuthorSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("PublicPost");

export const AuthResponseSchema = z
  .object({
    accessToken: z.string(),
    user: PublicUserSchema,
  })
  .openapi("AuthResponse");

export const CursorPageOfPostsSchema = z
  .object({
    items: z.array(PublicPostSchema),
    nextCursor: z.string().nullable(),
  })
  .openapi("CursorPageOfPosts");

// Register the error response as a reusable component up-front.
registry.register("ErrorResponse", ErrorResponseSchema);

// Register Bearer auth security scheme
registry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

export function generateOpenApiDoc() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Twitter-like API",
      version: "0.1.0",
      description: "MVP API for a Twitter-like social network.",
    },
    servers: [{ url: "http://localhost:4000", description: "Local dev" }],
  });
}
