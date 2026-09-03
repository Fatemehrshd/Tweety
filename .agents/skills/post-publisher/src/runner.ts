/**
 * Skill orchestration. Talks to the existing MCP server and nothing else:
 * no REST calls, no database, no reimplemented auth or business logic.
 * The MCP caller is injected so tests can substitute an in-memory double.
 */
import { SkillError } from "./errors.js";
import { readPostsFile, type ParsedPosts } from "./posts.js";

export interface McpCaller {
  callTool(name: string, args: Record<string, unknown>): Promise<{ isError?: boolean; text: string }>;
}

export interface PublishOptions {
  file: string;
  username: string;
  password: string;
}

export interface PublishedPost {
  index: number;
  id: string;
  text: string;
}

export interface PublishReport {
  file: string;
  total: number;
  published: PublishedPost[];
  skipped: { index: number; text: string | null; reason: string }[];
  note: string | null;
}

function parseToolJson(text: string, tool: string): { id: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SkillError(`MCP tool ${tool} returned non-JSON output.`);
  }
  if (typeof data !== "object" || data === null || typeof (data as { id?: unknown }).id !== "string") {
    throw new SkillError(`MCP tool ${tool} returned an unexpected shape.`);
  }
  return data as { id: string };
}

export async function runPublisher(caller: McpCaller, opts: PublishOptions): Promise<PublishReport> {
  if (!opts.username || !opts.password) {
    throw new SkillError("Username and password are required.");
  }
  // Parse + validate the whole file before touching the network.
  const parsed: ParsedPosts = readPostsFile(opts.file);

  const login = await caller.callTool("auth_login", { username: opts.username, password: opts.password });
  if (login.isError) {
    throw new SkillError(`Login failed: ${login.text}`);
  }

  const published: PublishedPost[] = [];
  const skipped = parsed.invalid.map((item) => ({ index: item.index, text: null as string | null, reason: item.reason }));

  for (const item of parsed.valid) {
    const res = await caller.callTool("posts_create", { text: item.text });
    if (res.isError) {
      skipped.push({ index: item.index, text: item.text, reason: res.text });
      continue;
    }
    published.push({ index: item.index, id: parseToolJson(res.text, "posts_create").id, text: item.text });
  }

  skipped.sort((a, b) => a.index - b.index);
  return {
    file: opts.file,
    total: parsed.total,
    published,
    skipped,
    note: parsed.total === 0 ? "posts.json holds no posts — nothing to publish." : null,
  };
}
