---
name: post-publisher
description: "Publish posts from a posts.json file through the Twitter MVP MCP server. Use when asked to post, publish, or import prepared content for a user. Drives the existing MCP server over stdio (auth_login, posts_create) — never calls REST or the database directly."
---

# Post Publisher

Publish the posts in a `posts.json` file as the authenticated user,
exclusively through the project's MCP server. This is the Agent-to-Skill-to-MCP
integration: Claude Code connects to the MCP server (see root `.mcp.json`)
and this skill does the file handling plus publishing flow.

## When to Apply

Use when the agent is asked to post prepared content: "publish these posts
for me", "post everything in posts.json", "import my drafts".

Do not use for summarizing (tweet-summarizer), hashtag search
(topic-discovery), or anything outside publishing file content as posts.

## How to Run

Prerequisites: the backend API running, and the MCP server built
(`pnpm --filter mcp build`).

```bash
node .agents/skills/post-publisher/dist/cli.js \
  --file posts.json --username <app-username> --password <app-password>
```

Build first if needed: `pnpm --filter post-publisher build`.
Prefer env vars for secrets: `MCP_USERNAME`, `MCP_PASSWORD` (`MCP_POSTS_FILE`).
Override the server entry with `--server <path>` or `MCP_SERVER_PATH`.

## Input Contract (`posts.json`)

```json
{ "posts": [{ "text": "hello" }] }
```

A bare array of `{ "text" }` items is also accepted. Each text: 1–280
characters. At most 100 posts per run. Invalid entries are reported as skips
while valid ones still publish; a structurally invalid file fails fast.

## Output Contract

A JSON report on stdout:

```json
{
  "file": "posts.json",
  "total": 3,
  "published": [{ "index": 0, "id": "...", "text": "..." }],
  "skipped": [{ "index": 2, "text": "...", "reason": "posts[2].text: ..." }],
  "note": null
}
```

An empty file yields `total` 0 with an explanatory `note` — not an error.

## Boundaries

- MCP only: the runner spawns `mcp/dist/index.js` and calls `auth_login` +
  `posts_create`. No REST URLs, no database, no reimplemented auth or business
  logic. Ownership and validation beyond shape stay server-side.
- Secrets (password, tokens) are never printed or logged.
