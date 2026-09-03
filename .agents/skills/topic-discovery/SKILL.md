---
name: topic-discovery
description: "Find a user's posts by hashtag through the Twitter MVP MCP server. Use when asked what a user posted about a topic, to collect posts tagged #x, or to report hashtag usage. Drives the existing MCP server over stdio (auth_login, posts_list_mine) — never calls REST or the database directly."
---

# Topic Discovery

Find the authenticated user's posts containing requested hashtag(s),
retrieved exclusively through the project's MCP server.

## When to Apply

Use when the agent is asked about posts on a topic: "what did I post about
the launch?", "find my #mvp posts", "report my hashtag usage".

Do not use for date-range recaps (that's tweet-summarizer) or other users'
posts.

## How to Run

Prerequisites: the backend API running, and the MCP server built
(`pnpm --filter mcp build`).

```bash
node .agents/skills/topic-discovery/dist/cli.js \
  --username <app-username> --password <app-password> \
  --hashtag launch --hashtag "#mvp"
```

Build first if needed: `pnpm --filter topic-discovery build`.
Tags may have or omit the `#` prefix and be comma-separated.
Prefer env vars for secrets: `MCP_USERNAME`, `MCP_PASSWORD` (`MCP_HASHTAGS`).
Override the server entry with `--server <path>` or `MCP_SERVER_PATH`.

## Input Contract

- `username`, `password`: app credentials. Used only for `auth_login`.
- One or more hashtags. At least one is required (exit 2 otherwise).

## Output Contract

A JSON report on stdout. A post matches if its text contains ANY requested
hashtag (union, case-insensitive, token-based — `#art` never matches
`#artist`):

```json
{
  "hashtags": ["launch", "mvp"],
  "matchMode": "any",
  "postCount": 2,
  "perHashtag": { "launch": 2, "mvp": 1 },
  "posts": [{ "id": "...", "text": "...", "createdAt": "...", "matchedHashtags": ["launch"] }],
  "note": null
}
```

- No matches: `postCount` 0 with an explicit `note` — not an error.

## Boundaries

- MCP only: the runner spawns `mcp/dist/index.js` and calls `auth_login` +
  `posts_list_mine` (following pagination). No REST URLs, no database, no
  reimplemented auth or business logic.
- Secrets (password, tokens) are never printed or logged.
