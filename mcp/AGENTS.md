# AGENTS.md — mcp

Applies only within `mcp/`. Also read the root `AGENTS.md` for repo-wide rules (branching, versioning, architecture characteristics, skills).

## What this is

- A Model Context Protocol (MCP) server — an **interface for an AI agent**, not an agent itself
- Exposes the existing backend API as MCP tools over stdio or Streamable HTTP; it owns no product logic

## Framework

- TypeScript on Node 20+
- `@modelcontextprotocol/sdk` with `StdioServerTransport`
- Zod for tool input schemas

## Boundaries — the critical rule

- **No separate application, database, auth system, or duplicated business logic.** Every tool is a thin call to the existing backend HTTP API (`API_BASE_URL`, default `http://localhost:4000`).
- Response DTOs mirror `backend/src/modules/shared/api-types.ts` — shapes only, never logic. If the backend changes a shape, update the mirror here.
- Never import from `backend/` or `frontend/` — the HTTP API is the only coupling.
- Session tokens live in process memory (one entry per MCP client: the stdio
  connection or one HTTP session id each). Never log tokens, passwords, or full user objects.
- The HTTP transport binds localhost by default and caps JSON bodies at 4 MB —
  never expose it beyond localhost without TLS + access control in front.
- New backend endpoints must be added as new tools in the same change that documents them (keep `mcp/README.md` tool table in sync).

## Reliability

- Every backend call has a timeout (10s) and exactly one retry on network failure — never retry 4xx
- A 401 triggers one silent token refresh before surfacing an auth error to the agent

## Observability

- Structured logs on stderr (stdout is reserved for MCP protocol frames) — never log secrets
- Log tool calls at debug level, auth events (login/logout/refresh) at info level
