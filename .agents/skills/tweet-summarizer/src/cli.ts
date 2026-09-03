#!/usr/bin/env node
/**
 * CLI: summarize the authenticated user's posts in a date range, via MCP only.
 * Usage: node dist/cli.js --username U --password P --start YYYY-MM-DD --end YYYY-MM-DD [--server PATH]
 * Env fallbacks: MCP_USERNAME, MCP_PASSWORD, MCP_SERVER_PATH.
 * Prints a JSON report on stdout. Errors (never containing secrets) go to stderr.
 */
import { runSummarizer } from "./runner.js";
import { connectStdio, defaultServerPath } from "./stdio-client.js";
import { SkillError } from "./report.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const username = arg("username") ?? process.env.MCP_USERNAME;
  const password = arg("password") ?? process.env.MCP_PASSWORD;
  const start = arg("start");
  const end = arg("end");
  const serverPath = arg("server") ?? process.env.MCP_SERVER_PATH ?? defaultServerPath();

  if (!username || !password || !start || !end) {
    console.error(
      "Usage: node dist/cli.js --username USER --password PASS --start YYYY-MM-DD --end YYYY-MM-DD [--server PATH]",
    );
    process.exit(2);
  }

  const { caller, close } = await connectStdio(serverPath);
  try {
    const report = await runSummarizer(caller, { username, password, start, end });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } finally {
    await close();
  }
}

main().catch((err) => {
  const message = err instanceof SkillError ? err.message : "Unexpected failure";
  console.error(`tweet-summarizer: ${message}`);
  process.exit(1);
});
