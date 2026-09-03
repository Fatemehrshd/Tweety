import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const UpdateProfileBodySchema = z
  .object({
    bio: z.string().max(160).nullable().optional(),
    profilePictureUrl: z.string().url().nullable().optional(),
  })
  .openapi("UpdateProfileBody");

export const UsernameParamSchema = z.object({
  username: z.string().min(1),
});

export const ChangePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .openapi("ChangePasswordBody");

export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;
export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>;
