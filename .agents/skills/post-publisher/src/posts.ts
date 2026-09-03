/**
 * Pure posts.json parsing + validation. No I/O beyond reading the given file
 * path, no MCP, no secrets — fully unit-testable.
 *
 * Accepted shape (or a bare array of the same items):
 *   { "posts": [{ "text": "hello" }, ...] }
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { SkillError } from "./errors.js";

export const MAX_ITEMS = 100;

const PostItemSchema = z.object({
  text: z.string().min(1, "text must not be empty").max(280, "text must be at most 280 characters"),
});

const LooseFileSchema = z.union([
  z.object({ posts: z.array(z.unknown()) }),
  z.array(z.unknown()).transform((posts) => ({ posts })),
]);

export interface ValidItem {
  index: number;
  text: string;
}

export interface InvalidItem {
  index: number;
  reason: string;
}

export interface ParsedPosts {
  valid: ValidItem[];
  invalid: InvalidItem[];
  total: number;
}

function describeIssue(index: number, issue: z.ZodIssue): InvalidItem {
  const where = issue.path.length > 0 ? `posts[${index}].${issue.path.join(".")}` : `posts[${index}]`;
  return { index, reason: `${where}: ${issue.message}` };
}

export function parsePostsJson(raw: string): ParsedPosts {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new SkillError("posts.json is not valid JSON.");
  }
  const parsed = LooseFileSchema.safeParse(data);
  if (!parsed.success) {
    throw new SkillError(
      'posts.json has an invalid shape: expected { "posts": [{ "text": "..." }] } or a bare array of { "text" } items.',
    );
  }

  const items = parsed.data.posts;
  if (items.length > MAX_ITEMS) {
    throw new SkillError(`posts.json holds ${items.length} posts; the limit is ${MAX_ITEMS} per run.`);
  }

  // Validate each item individually so bad entries are reported as skips
  // while valid ones still publish.
  const valid: ValidItem[] = [];
  const invalid: InvalidItem[] = [];
  items.forEach((item, index) => {
    const check = PostItemSchema.safeParse(item);
    if (check.success) valid.push({ index, text: check.data.text });
    else invalid.push(describeIssue(index, check.error.issues[0]!));
  });
  return { valid, invalid, total: items.length };
}

export function readPostsFile(path: string): ParsedPosts {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new SkillError(`Cannot read posts file at ${JSON.stringify(path)}.`);
  }
  return parsePostsJson(raw);
}
