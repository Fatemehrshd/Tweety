import { NextResponse } from "next/server";
import { generateOpenApiDoc } from "@/modules/shared/swagger";

export function GET() {
  const doc = generateOpenApiDoc();
  return NextResponse.json(doc);
}
