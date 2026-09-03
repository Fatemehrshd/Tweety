---
name: tweet-summarizer
description: "Summarize a user's posts within a date range through the Twitter MVP MCP server. Use when asked to recap, review, or report on what a user posted between two dates. Drives the existing MCP server over stdio (auth_login, posts_list_mine) — never calls REST or the database directly."
---

# Tweet Summarizer

Summarize the authenticated user's posts in a requested time range, retrieved
exclusively through the project's MCP server.

## When to Apply

Use when the agent is asked to recap, review, or report on posted content over
a period: "summarize my posts last week", "what did I post in September?",
"give me a report of my August activity".

Do not use for anything other than summarizing post content in a date range.

## How to Run

Prerequisites: the backend API running, and the MCP server built
(`pnpm --filter mcp build`).

```bash
node .agents/skills/tweet-summarizer/dist/cli.js \
  --username <app-username> --password <app-password> \
  --start YYYY-MM-DD --end YYYY-MM-DD
```

Build first if needed: `pnpm --filter tweet-summarizer build`.
Prefer env vars for secrets: `MCP_USERNAME`, `MCP_PASSWORD`.
Override the server entry with `--server <path>` or `MCP_SERVER_PATH`.

## Input Contract

- `username`, `password`: app credentials. Used only for `auth_login`.
- `start`, `end`: `YYYY-MM-DD` (or full ISO-8601). The end day is inclusive.
  `start` after `end`, or unparseable dates, fail with a clear error (exit 1).

## Output Contract

A JSON report on stdout:

```json
{
  "timeRange": { "start": "2026-08-01", "end": "2026-08-31" },
  "postCount": 3,
  "posts": [{ "id": "...", "text": "...", "createdAt": "..." }],
  "summary": {
    "totalChars": 120,
    "avgLength": 40.0,
    "perDay": { "2026-08-03": 2, "2026-08-10": 1 },
    "topTerms": [{ "term": "launch", "count": 2 }],
    "longestExcerpt": "...",
    "note": null
  }
}
```

- Empty range: `postCount` 0 with `summary.note` set — not an error.
- The agent turns this structured report into the final narrative for the user.

## Boundaries

- MCP only: the runner spawns `mcp/dist/index.js` and calls `auth_login` +
  `posts_list_mine` (following pagination). No REST URLs, no database, no
  reimplemented auth or business logic.
- Secrets (password, tokens) are never printed or logged.
