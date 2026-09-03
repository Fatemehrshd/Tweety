import jwt, { type SignOptions } from "jsonwebtoken";
import { AuthError } from "./errors";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-please-replace-in-env";
const ACCESS_TTL = "15m";

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  username: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL } satisfies SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
    if (!decoded.sub || !decoded.email || !decoded.username) {
      throw new AuthError("Malformed token");
    }
    return decoded;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Invalid or expired access token");
  }
}

/** Extract bearer token from a Request's Authorization header. */
export function extractBearer(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
