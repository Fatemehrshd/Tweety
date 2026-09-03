#!/usr/bin/env node
/**
 * MCP server (stdio) exposing the Twitter-like backend as agent tools.
 * Interface only: every tool is a thin call to the existing HTTP API.
 * Logs go to stderr — stdout is reserved for MCP protocol frames.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { apiCall, type CursorPage, type PublicPost, type PublicUser } from "./api.js";
import { login, logout, status, withAuth, NotAuthenticatedError } from "./session.js";
import { ApiError } from "./api.js";

const server = new McpServer({ name: "twitter-mvp", version: "0.1.0" });

type Result = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (data: unknown): Result => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

const fail = (err: unknown): Result => {
  const text =
    err instanceof ApiError
      ? `Error (${err.code}, HTTP ${err.statusCode}): ${err.message}`
      : err instanceof NotAuthenticatedError
        ? err.message
        : err instanceof Error
          ? `Error: ${err.message}`
          : "Unknown error";
  return { content: [{ type: "text", text }], isError: true };
};

/** Wrap a tool handler so backend/auth errors become MCP error results. */
const tool =
  <A>(fn: (args: A) => Promise<unknown>) =>
  async (args: A): Promise<Result> => {
    try {
      return ok(await fn(args));
    } catch (err) {
      return fail(err);
    }
  };

const cursorShape = {
  cursor: z.string().optional().describe("Pagination cursor from a previous response"),
  limit: z.number().int().min(1).max(100).default(20).describe("Page size (1-100)"),
};

// --- Auth ---

server.tool(
  "auth_login",
  "Log in with your app username and password. Required before any authenticated tool. Returns your public profile (tokens stay server-side).",
  { username: z.string().min(1), password: z.string().min(1) },
  tool(async ({ username, password }: { username: string; password: string }) => login(username, password)),
);

server.tool(
  "auth_logout",
  "Log out and discard the current session.",
  {},
  tool(async () => {
    await logout();
    return { loggedOut: true };
  }),
);

server.tool(
  "auth_status",
  "Check whether a session is active and who it belongs to.",
  {},
  tool(async () => status()),
);

// --- Users ---

server.tool(
  "users_get_profile",
  "Get any user's public profile (username, bio, avatar) by username. No login needed.",
  { username: z.string().min(1) },
  tool(async ({ username }: { username: string }) => {
    const res = await apiCall<PublicUser>("GET", `/api/users/${encodeURIComponent(username)}`);
    return res.data;
  }),
);

server.tool(
  "users_get_posts",
  "List a user's posts by username, newest first (paginated). No login needed.",
  { username: z.string().min(1), ...cursorShape },
  tool(async ({ username, cursor, limit }: { username: string; cursor?: string; limit: number }) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    const res = await apiCall<CursorPage<PublicPost>>(
      "GET",
      `/api/users/${encodeURIComponent(username)}/posts?${params}`,
    );
    return res.data;
  }),
);

server.tool(
  "users_update_me",
  "Update your own bio and/or avatar URL. Login required.",
  {
    bio: z.string().max(160).nullable().optional(),
    profilePictureUrl: z.string().url().nullable().optional(),
  },
  tool(
    async ({ bio, profilePictureUrl }: { bio?: string | null; profilePictureUrl?: string | null }) =>
      withAuth(async (token) => {
        const body: Record<string, string | null> = {};
        if (bio !== undefined) body.bio = bio;
        if (profilePictureUrl !== undefined) body.profilePictureUrl = profilePictureUrl;
        const res = await apiCall<PublicUser>("PATCH", "/api/users/me", { token, body });
        return res.data;
      }),
  ),
);

server.tool(
  "users_change_password",
  "Change your own password (current password required). Login required.",
  { currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) },
  tool(async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
    withAuth(async (token) => {
      const res = await apiCall<PublicUser>("PATCH", "/api/users/me/password", {
        token,
        body: { currentPassword, newPassword },
      });
      return res.data;
    }),
  ),
);

// --- Posts ---

server.tool(
  "posts_list_mine",
  "List your own posts, newest first (paginated). Login required.",
  cursorShape,
  tool(async ({ cursor, limit }: { cursor?: string; limit: number }) =>
    withAuth(async (token) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set("cursor", cursor);
      const res = await apiCall<CursorPage<PublicPost>>("GET", `/api/posts?${params}`, { token });
      return res.data;
    }),
  ),
);

server.tool(
  "posts_create",
  "Publish a new post (1-280 characters). Login required.",
  { text: z.string().min(1).max(280) },
  tool(async ({ text }: { text: string }) =>
    withAuth(async (token) => {
      const res = await apiCall<PublicPost>("POST", "/api/posts", { token, body: { text } });
      return res.data;
    }),
  ),
);

server.tool(
  "posts_get",
  "Get a single post by id. No login needed.",
  { id: z.string().uuid() },
  tool(async ({ id }: { id: string }) => {
    const res = await apiCall<PublicPost>("GET", `/api/posts/${id}`);
    return res.data;
  }),
);

server.tool(
  "posts_update",
  "Edit your own post. Login required.",
  { id: z.string().uuid(), text: z.string().min(1).max(280) },
  tool(async ({ id, text }: { id: string; text: string }) =>
    withAuth(async (token) => {
      const res = await apiCall<PublicPost>("PATCH", `/api/posts/${id}`, { token, body: { text } });
      return res.data;
    }),
  ),
);

server.tool(
  "posts_delete",
  "Delete your own post. Login required.",
  { id: z.string().uuid() },
  tool(async ({ id }: { id: string }) =>
    withAuth(async (token) => {
      await apiCall("DELETE", `/api/posts/${id}`, { token });
      return { deleted: true };
    }),
  ),
);

// --- Explore ---

server.tool(
  "explore_feed",
  "Global feed: posts from all users, newest first (paginated). No login needed.",
  cursorShape,
  tool(async ({ cursor, limit }: { cursor?: string; limit: number }) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    const res = await apiCall<CursorPage<PublicPost>>("GET", `/api/explore?${params}`);
    return res.data;
  }),
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error("[mcp] twitter-mvp serving 13 tools over stdio");
}

main().catch((err) => {
  console.error("[mcp] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
