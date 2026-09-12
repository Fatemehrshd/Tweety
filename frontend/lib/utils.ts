import { twMerge } from "tailwind-merge";

export type ClassValue =
  | string
  | number
  | null
  | undefined
  | boolean
  | ClassValue[]
  | Record<string, unknown>;

// Same semantics as clsx (strings, numbers, falsy-skip, arrays, conditional
// objects). Vendored because the npm registry is currently unreachable;
// swap back to `import { clsx } from "clsx"` once `pnpm add clsx` succeeds.
function cx(...args: ClassValue[]): string {
  const out: string[] = [];
  for (const arg of args) {
    if (!arg || typeof arg === "boolean") continue;
    if (typeof arg === "string" || typeof arg === "number") out.push(String(arg));
    else if (Array.isArray(arg)) out.push(cx(...arg));
    else if (typeof arg === "object")
      for (const [key, value] of Object.entries(arg)) if (value) out.push(key);
  }
  return out.join(" ");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(cx(...inputs));
}
