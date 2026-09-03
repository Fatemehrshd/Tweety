import type { ZodSchema, ZodTypeAny } from "zod";
import { ValidationError } from "./errors";

export async function parseJsonBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<ReturnType<S["parse"]>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  return parseWithSchema(raw, schema, "body");
}

export function parseQuery<S extends ZodTypeAny>(req: Request, schema: S): ReturnType<S["parse"]> {
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    obj[k] = v;
  }
  return parseWithSchema(obj, schema, "query");
}

export function parseParams<S extends ZodTypeAny>(params: Record<string, string>, schema: S): ReturnType<S["parse"]> {
  return parseWithSchema(params, schema, "params");
}

function parseWithSchema<S extends ZodTypeAny>(input: unknown, schema: S, label: string): ReturnType<S["parse"]> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`Invalid ${label}`, result.error.flatten());
  }
  return result.data as ReturnType<S["parse"]>;
}
