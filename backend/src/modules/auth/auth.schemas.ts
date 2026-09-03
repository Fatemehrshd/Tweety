import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const RegisterBodySchema = z
  .object({
    email: z.string().email().max(255),
    username: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, digits, and underscores"),
    password: z.string().min(8).max(128),
  })
  .openapi("RegisterBody");

export const LoginBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .openapi("LoginBody");

export type RegisterBody = z.infer<typeof RegisterBodySchema>;
export type LoginBody = z.infer<typeof LoginBodySchema>;
