#!/usr/bin/env node
/**
 * CLI: publish the posts in a posts.json file through the MCP server.
 * Usage: node dist/cli.js --file posts.json --username U --password P [--server PATH]
 * Env fallbacks: MCP_POSTS_FILE, MCP_USERNAME, MCP_PASSWORD, MCP_SERVER_PATH.
 * Prints a JSON report on stdout. Errors (never containing secrets) go to stderr.
 */
import { runPublisher } from "./runner.js";
import { connectStdio, defaultServerPath } from "./stdio-client.js";
import { SkillError } from "./errors.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const file = arg("file") ?? process.env.MCP_POSTS_FILE;
  const username = arg("username") ?? process.env.MCP_USERNAME;
  const password = arg("password") ?? process.env.MCP_PASSWORD;
  const serverPath = arg("server") ?? process.env.MCP_SERVER_PATH ?? defaultServerPath();

  if (!file || !username || !password) {
    console.error("Usage: node dist/cli.js --file posts.json --username USER --password PASS [--server PATH]");
    process.exit(2);
  }

  const { caller, close } = await connectStdio(serverPath);
  try {
    const report = await runPublisher(caller, { file, username, password });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } finally {
    await close();
  }
}

main().catch((err) => {
  const message = err instanceof SkillError ? err.message : "Unexpected failure";
  console.error(`post-publisher: ${message}`);
  process.exit(1);
});
