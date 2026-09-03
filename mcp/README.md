# MCP server (stdio)

MCP interface for an AI agent to the Twitter-like backend. **Interface only** —
it owns no product logic: every tool is a thin call to the existing backend
HTTP API, using the existing authentication flow.

## Prerequisites

- The backend API running (default `http://localhost:4000`):
  `pnpm dev:backend` from the repo root
- Node 20+

## Run

Stdio (default — for Claude Desktop and other local clients):

```bash
pnpm --filter mcp build && pnpm --filter mcp start
```

Streamable HTTP (for remote/networked clients):

```bash
MCP_TRANSPORT=http pnpm --filter mcp start
# -> http://127.0.0.1:4100/mcp  (+ GET /health)
```

| Variable | Default | Meaning |
| -------- | ------- | ------- |
| `API_BASE_URL` | `http://localhost:4000` | Existing backend API |
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MCP_HOST` | `127.0.0.1` | HTTP bind address (keep localhost unless behind TLS + access control) |
| `MCP_PORT` | `4100` | HTTP port |

## Use with an MCP client (Claude Desktop example)

```json
{
  "mcpServers": {
    "twitter-mvp": {
      "command": "node",
      "args": ["/absolute/path/to/final-project/mcp/dist/index.js"],
      "env": { "API_BASE_URL": "http://localhost:4000" }
    }
  }
}
```

Or with the MCP Inspector for a quick smoke test:

```bash
npx @modelcontextprotocol/inspector node mcp/dist/index.js
```

## Tools (13)

| Tool | Auth | What it does |
| ---- | ---- | ------------ |
| `auth_login` | — | Log in with app **username + password** (email is resolved via the public profile, then the normal login flow runs) |
| `auth_logout` | — | Discard the session (server-side refresh token revoked best-effort) |
| `auth_status` | — | Show whether a session is active |
| `users_get_profile` | — | Public profile by username |
| `users_get_posts` | — | A user's posts, cursor-paginated |
| `users_update_me` | yes | Update own bio / avatar URL |
| `users_change_password` | yes | Change own password (current required) |
| `posts_list_mine` | yes | Own posts, cursor-paginated |
| `posts_create` | yes | Publish (1–280 chars) |
| `posts_get` | — | Single post by id |
| `posts_update` | yes | Edit own post |
| `posts_delete` | yes | Delete own post |
| `explore_feed` | — | Global feed, cursor-paginated |

Avatar **file upload** is intentionally not exposed (binary payloads over
stdio); set an avatar URL via `users_update_me` instead.

## Session notes

- Tokens live in process memory only and are never returned to the agent or logged.
- stdio serves one client; HTTP keeps one auth session per MCP session id, so
  concurrent clients never share tokens. Closing an MCP session drops its auth.
- A 401 triggers exactly one silent token refresh (rotating refresh cookie,
  same as the web client) before an auth error surfaces.
- Unknown usernames fail at login with "User not found" — the public profile
  lookup makes username existence visible, same as the website's public
  profiles.
