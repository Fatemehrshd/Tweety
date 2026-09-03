import "@/modules/users/users.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest, requireAuth } from "@/modules/shared/request-context";
import { parseJsonBody } from "@/modules/shared/validate";
import { ChangePasswordBodySchema } from "@/modules/users/users.schemas";
import { changePassword } from "@/modules/users/users.service";

export const PATCH = withErrorHandling(
  withRequest(async (req: Request) => {
    const { userId } = requireAuth();
    const { currentPassword, newPassword } = await parseJsonBody(req, ChangePasswordBodySchema);
    const user = await changePassword(userId, currentPassword, newPassword);
    return NextResponse.json(user);
  }),
);
