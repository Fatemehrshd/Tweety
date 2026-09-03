import type { CursorPage, PublicPost } from "@/modules/shared/api-types";
import { toPublicPost } from "@/modules/posts";
import { findAllPostsPaginated } from "./explore.repository";

const DEFAULT_LIMIT = 20;

export async function getExploreFeed(
  cursor: string | null,
  limit = DEFAULT_LIMIT,
): Promise<CursorPage<PublicPost>> {
  const rows = await findAllPostsPaginated(cursor, limit);
  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(toPublicPost);
  const nextCursor = hasMore ? (items[items.length - 1]?.createdAt ?? null) : null;
  return { items, nextCursor };
}
