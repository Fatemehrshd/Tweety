/**
 * Streamable HTTP transport (stateful): one MCP session id per client, each
 * with its own backend auth session. Binds localhost by default — expose
 * beyond that only behind TLS + access control.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer, clearSession } from "./server.js";

const PORT = Number(process.env.MCP_PORT ?? 4100);
const HOST = process.env.MCP_HOST ?? "127.0.0.1";
const BODY_LIMIT_BYTES = 4 * 1024 * 1024;

const transports = new Map<string, StreamableHTTPServerTransport>();

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/** Read + parse a JSON body with a size cap. `undefined` when bodyless. */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > BODY_LIMIT_BYTES) throw Object.assign(new Error("Body too large"), { status: 413 });
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

export async function startHttpServer(): Promise<void> {
  const http = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://local");

      if (url.pathname === "/health" && req.method === "GET") {
        send(res, 200, { status: "ok", transport: "streamable-http" });
        return;
      }

      if (url.pathname !== "/mcp") {
        send(res, 404, { error: "Not found" });
        return;
      }

      if (req.method === "POST") {
        const body = await readJsonBody(req);
        const sessionId = req.headers["mcp-session-id"];
        const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;

        if (sid) {
          const transport = transports.get(sid);
          if (!transport) {
            send(res, 404, { error: "Unknown MCP session" });
            return;
          }
          await transport.handleRequest(req, res, body);
          return;
        }

        // New session: only an initialize request may start one.
        let transport: StreamableHTTPServerTransport;
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id: string): void => {
            transports.set(id, transport);
          },
          onsessionclosed: (id) => {
            transports.delete(id);
            clearSession(id);
          },
        });
        await createMcpServer().connect(transport);
        await transport.handleRequest(req, res, body);
        return;
      }

      if (req.method === "GET" || req.method === "DELETE") {
        const sessionId = req.headers["mcp-session-id"];
        const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;
        const transport = sid ? transports.get(sid) : undefined;
        if (!transport) {
          send(res, sid ? 404 : 400, { error: "Missing or unknown MCP session id" });
          return;
        }
        await transport.handleRequest(req, res);
        return;
      }

      send(res, 405, { error: "Method not allowed" });
    } catch (err) {
      const status = typeof (err as { status?: unknown }).status === "number" ? (err as { status: number }).status : 500;
      console.error("[mcp] http error:", err instanceof Error ? err.message : err);
      if (!res.headersSent) send(res, status, { error: "Internal server error" });
      else res.end();
    }
  });

  await new Promise<void>((resolve) => http.listen(PORT, HOST, resolve));
  console.error(`[mcp] twitter-mvp serving Streamable HTTP on http://${HOST}:${PORT}/mcp`);
}
