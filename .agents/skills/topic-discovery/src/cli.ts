#!/usr/bin/env node
/**
 * CLI: discover the authenticated user's posts by hashtag, via MCP only.
 * Usage: node dist/cli.js --username U --password P --hashtag TAG [--hashtag TAG2 ...] [--server PATH]
 * Comma-separated tags also accepted: --hashtag "#launch,#mvp".
 * Env fallbacks: MCP_USERNAME, MCP_PASSWORD, MCP_SERVER_PATH, MCP_HASHTAGS.
 * Prints a JSON report on stdout. Errors (never containing secrets) go to stderr.
 */
import { runDiscovery } from "./runner.js";
import { connectStdio, defaultServerPath } from "./stdio-client.js";
import { SkillError } from "./topic.js";

function argAll(name: string): string[] {
  const out: string[] = [];
  const argv = process.argv;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === `--${name}` && i + 1 < argv.length) out.push(argv[i + 1]!);
  }
  return out;
}

function arg(name: string): string | undefined {
  return argAll(name)[0];
}

async function main(): Promise<void> {
  const username = arg("username") ?? process.env.MCP_USERNAME;
  const password = arg("password") ?? process.env.MCP_PASSWORD;
  const hashtags = [...argAll("hashtag"), ...(process.env.MCP_HASHTAGS ? [process.env.MCP_HASHTAGS] : [])];
  const serverPath = arg("server") ?? process.env.MCP_SERVER_PATH ?? defaultServerPath();

  if (!username || !password || hashtags.length === 0) {
    console.error(
      "Usage: node dist/cli.js --username USER --password PASS --hashtag TAG [--hashtag TAG2 ...] [--server PATH]",
    );
    process.exit(2);
  }

  const { caller, close } = await connectStdio(serverPath);
  try {
    const report = await runDiscovery(caller, { username, password, hashtags });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } finally {
    await close();
  }
}

main().catch((err) => {
  const message = err instanceof SkillError ? err.message : "Unexpected failure";
  console.error(`topic-discovery: ${message}`);
  process.exit(1);
});
