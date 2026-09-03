export const REFRESH_COOKIE_NAME = "refresh_token";

const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function buildRefreshCookie(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${REFRESH_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/api/auth",
    `Max-Age=${REFRESH_MAX_AGE_SECONDS}`,
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearRefreshCookie(): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [`${REFRESH_COOKIE_NAME}=`, "HttpOnly", "SameSite=Lax", "Path=/api/auth", "Max-Age=0"];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

export function getRefreshCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const cookies = header.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const name = trimmed.slice(0, eq);
    if (name === REFRESH_COOKIE_NAME) {
      return trimmed.slice(eq + 1);
    }
  }
  return null;
}
