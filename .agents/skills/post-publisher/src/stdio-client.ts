/**
 * Real MCP transport: spawns the existing Phase-2 MCP server over stdio and
 * speaks MCP protocol to it. The skill never touches REST or the database.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SkillError } from "./errors.js";
import type { McpCaller } from "./runner.js";

/** Default server entry, resolved from this skill's location in the repo. */
export function defaultServerPath(): string {
  // dist/stdio-client.js -> up 4 = repo root -> mcp/dist/index.js
  const here = path.dirname(fileURLToPath(import.meta.url));
  const entry = path.resolve(here, "../../../../mcp/dist/index.js");
  if (!existsSync(entry)) {
    throw new SkillError(
      `MCP server not found at ${entry}. Build it first: pnpm --filter mcp build. ` +
        `Or pass --server <path to mcp/dist/index.js>.`,
    );
  }
  return entry;
}

export async function connectStdio(serverPath: string): Promise<{ caller: McpCaller; close: () => Promise<void> }> {
  // StdioClientTransport spawns and owns the server subprocess.
  const transport = new StdioClientTransport({ command: "node", args: [serverPath] });
  const client = new Client({ name: "post-publisher", version: "0.1.0" });
  try {
    await client.connect(transport);
  } catch (err) {
    throw new SkillError(`Could not start MCP server: ${err instanceof Error ? err.message : err}`);
  }
  return {
    caller: {
      async callTool(name: string, args: Record<string, unknown>) {
        const res = (await client.callTool({ name, arguments: args })) as {
          content: { type: string; text?: string }[];
          isError?: boolean;
        };
        const text = res.content.map((c) => c.text ?? "").join("");
        return { isError: res.isError, text };
      },
    },
    close: async () => {
      await client.close();
    },
  };
}
