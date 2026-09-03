import "@/modules/users/users.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest } from "@/modules/shared/request-context";
import { parseParams } from "@/modules/shared/validate";
import { UsernameParamSchema } from "@/modules/users/users.schemas";
import { getProfileByUsername } from "@/modules/users/users.service";

export const GET = withErrorHandling(
  withRequest(async (_req: Request, { params }: { params: Promise<{ username: string }> }) => {
    const { username } = parseParams(await params, UsernameParamSchema);
    const user = await getProfileByUsername(username);
    return NextResponse.json(user);
  }),
);
