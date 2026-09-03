import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { registry, AuthResponseSchema, ErrorResponseSchema } from "@/modules/shared/swagger";
import { RegisterBodySchema, LoginBodySchema } from "./auth.schemas";

extendZodWithOpenApi(z);

// Register schemas as components
registry.register("RegisterBody", RegisterBodySchema);
registry.register("LoginBody", LoginBodySchema);

const tags = ["Auth"];
const errorResponses = {
  400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  409: { description: "Conflict", content: { "application/json": { schema: ErrorResponseSchema } } },
};

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags,
  summary: "Register a new account",
  request: { body: { content: { "application/json": { schema: RegisterBodySchema } } } },
  responses: {
    201: { description: "Registered", content: { "application/json": { schema: AuthResponseSchema } } },
    ...errorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags,
  summary: "Log in",
  request: { body: { content: { "application/json": { schema: LoginBodySchema } } } },
  responses: {
    200: { description: "Logged in", content: { "application/json": { schema: AuthResponseSchema } } },
    ...errorResponses,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/refresh",
  tags,
  summary: "Refresh access token using httpOnly refresh-token cookie",
  responses: {
    200: { description: "New access token", content: { "application/json": { schema: AuthResponseSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags,
  summary: "Logout (clears refresh token)",
  responses: {
    204: { description: "Logged out" },
  },
});
