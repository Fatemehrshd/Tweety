import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";

// CORS — frontend on 3000, backend on 4000. credentials: 'include' required on the client.
const CORS = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Expose-Headers": "X-Request-ID",
};

export function middleware(req: NextRequest) {
  // Generate / propagate a request ID for every API call.
  const incoming = req.headers.get("x-request-id");
  const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();

  // Preflight — answer immediately.
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: { ...CORS, "X-Request-ID": requestId },
    });
  }

  // Forward the request ID to the route handler (read by `withRequest`).
  const forwarded = new Headers(req.headers);
  forwarded.set("x-request-id", requestId);

  const res = NextResponse.next({ request: { headers: forwarded } });
  res.headers.set("X-Request-ID", requestId);
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: ["/api/:path*", "/health"],
};
