import "@/modules/users/users.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest, requireAuth } from "@/modules/shared/request-context";
import { parseJsonBody } from "@/modules/shared/validate";
import { UpdateProfileBodySchema } from "@/modules/users/users.schemas";
import { getProfileById, updateProfile } from "@/modules/users/users.service";

export const GET = withErrorHandling(
  withRequest(async (_req: Request) => {
    const { userId } = requireAuth();
    const user = await getProfileById(userId);
    return NextResponse.json(user);
  }),
);

export const PATCH = withErrorHandling(
  withRequest(async (req: Request) => {
    const { userId } = requireAuth();
    const body = await parseJsonBody(req, UpdateProfileBodySchema);
    const user = await updateProfile(userId, body);
    return NextResponse.json(user);
  }),
);
