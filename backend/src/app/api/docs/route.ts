import { NextResponse } from "next/server";
import { generateOpenApiDoc } from "@/modules/shared/swagger";

// Side-effect imports — each module registers its paths/schemas on the shared
// registry at load time. Without these, `paths` comes out empty.
import "@/modules/auth/auth.openapi";
import "@/modules/users/users.openapi";
import "@/modules/posts/posts.openapi";
import "@/modules/explore/explore.openapi";

export function GET() {
  const doc = generateOpenApiDoc();
  return NextResponse.json(doc);
}
