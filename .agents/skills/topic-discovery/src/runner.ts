/**
 * Skill orchestration. Talks to the existing MCP server and nothing else:
 * no REST calls, no database, no reimplemented auth or business logic.
 * The MCP caller is injected so tests can substitute an in-memory double.
 */
import { SkillError, normalizeHashtags, buildReport, type PostLike, type DiscoveryReport } from "./topic.js";

export interface McpCaller {
  callTool(name: string, args: Record<string, unknown>): Promise<{ isError?: boolean; text: string }>;
}

export interface DiscoverOptions {
  username: string;
  password: string;
  hashtags: string[];
}

interface CursorPage {
  items: PostLike[];
  nextCursor: string | null;
}

function parseToolJson(text: string, tool: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new SkillError(`MCP tool ${tool} returned non-JSON output.`);
  }
}

export async function runDiscovery(caller: McpCaller, opts: DiscoverOptions): Promise<DiscoveryReport> {
  if (!opts.username || !opts.password) {
    throw new SkillError("Username and password are required.");
  }
  // Fail fast on empty tag input before touching the network.
  const tags = normalizeHashtags(opts.hashtags);

  const login = await caller.callTool("auth_login", { username: opts.username, password: opts.password });
  if (login.isError) {
    throw new SkillError(`Login failed: ${login.text}`);
  }

  const posts: PostLike[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await caller.callTool("posts_list_mine", { ...(cursor ? { cursor } : {}), limit: 100 });
    if (page.isError) {
      throw new SkillError(`Could not retrieve posts: ${page.text}`);
    }
    const parsed = parseToolJson(page.text, "posts_list_mine") as CursorPage;
    if (!Array.isArray(parsed.items)) {
      throw new SkillError("MCP tool posts_list_mine returned an unexpected shape.");
    }
    posts.push(...parsed.items);
    if (!parsed.nextCursor) break;
    cursor = parsed.nextCursor;
  }

  return buildReport(tags, posts);
}
