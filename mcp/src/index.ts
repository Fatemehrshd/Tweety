#!/usr/bin/env node
/**
 * Transport bootstrap. MCP_TRANSPORT=stdio (default) or http.
 * Logs go to stderr — stdout is reserved for MCP protocol frames (stdio).
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";
import { startHttpServer } from "./http.js";

async function main(): Promise<void> {
  const transport = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();
  if (transport === "http") {
    await startHttpServer();
    return;
  }
  if (transport !== "stdio") {
    console.error(`[mcp] unknown MCP_TRANSPORT=${process.env.MCP_TRANSPORT}, falling back to stdio`);
  }
  await createMcpServer().connect(new StdioServerTransport());
  console.error("[mcp] twitter-mvp serving 13 tools over stdio");
}

main().catch((err) => {
  console.error("[mcp] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
