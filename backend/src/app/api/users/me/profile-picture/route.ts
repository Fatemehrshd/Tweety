import "@/modules/users/users.openapi";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/modules/shared/error-handler";
import { withRequest, requireAuth } from "@/modules/shared/request-context";
import { ValidationError } from "@/modules/shared/errors";
import { uploadProfilePicture } from "@/modules/users/users.service";

export const POST = withErrorHandling(
  withRequest(async (req: Request) => {
    const { userId } = requireAuth();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("A 'file' field with an image is required");
    }
    const user = await uploadProfilePicture(userId, file);
    return NextResponse.json(user);
  }),
);
