import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { ValidationError } from "@/modules/shared/errors";
import { logger } from "@/modules/shared/logger";

// Local-disk avatar storage, behind this module's boundary.
// Uploaded files are served by Next.js from /public at /uploads/*.
// Absolute public base URL so <img> works cross-origin from the frontend.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
export const UPLOADS_URL_PREFIX = "/uploads/";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

export function isLocalUploadUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.pathname.startsWith(UPLOADS_URL_PREFIX);
  } catch {
    return url.startsWith(UPLOADS_URL_PREFIX);
  }
}

function localFilePath(url: string): string {
  const pathname = url.startsWith("http") ? new URL(url).pathname : url;
  // basename blocks path traversal — only files directly in UPLOAD_DIR resolve.
  return path.join(UPLOAD_DIR, path.basename(pathname));
}

/** Validate + persist an uploaded avatar. Returns the absolute public URL. */
export async function saveProfilePicture(file: File): Promise<string> {
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    throw new ValidationError("Avatar must be a JPEG, PNG, WebP, or GIF image");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new ValidationError("Avatar must be at most 5 MB");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  return `${PUBLIC_BASE_URL}${UPLOADS_URL_PREFIX}${filename}`;
}

/** Remove a previously uploaded avatar. Best-effort — logs instead of failing. */
export async function deleteProfilePicture(url: string | null): Promise<void> {
  if (!isLocalUploadUrl(url)) return;
  try {
    await unlink(localFilePath(url));
  } catch (err) {
    logger.warn({ err }, "[users] failed to delete old avatar");
  }
}
