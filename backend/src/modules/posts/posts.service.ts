import { NotFoundError, ForbiddenError } from "@/modules/shared/errors";
import type { PublicPost, CursorPage } from "@/modules/shared/api-types";
import type { Post } from "@/db/entities/Post";
import {
  findPostById,
  findPostsByAuthor,
  createPost,
  updatePost,
  deletePost,
} from "./posts.repository";

const DEFAULT_LIMIT = 20;

export function toPublicPost(post: Post): PublicPost {
  return {
    id: post.id,
    text: post.text,
    author: {
      id: post.author.id,
      username: post.author.username,
      profilePictureUrl: post.author.profilePictureUrl,
    },
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function getMyPosts(
  authorId: string,
  cursor: string | null,
  limit = DEFAULT_LIMIT,
): Promise<CursorPage<PublicPost>> {
  const rows = await findPostsByAuthor(authorId, cursor, limit);
  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(toPublicPost);
  const nextCursor = hasMore ? items[items.length - 1]?.createdAt ?? null : null;
  return { items, nextCursor };
}

export async function createNewPost(authorId: string, text: string): Promise<PublicPost> {
  const post = await createPost({ authorId, text });
  return toPublicPost(post);
}

export async function editPost(
  postId: string,
  requesterId: string,
  text: string,
): Promise<PublicPost> {
  const post = await findPostById(postId);
  if (!post) throw new NotFoundError("Post not found");
  if (post.authorId !== requesterId) throw new ForbiddenError("Cannot edit another user's post");

  const updated = await updatePost(postId, text);
  return toPublicPost(updated);
}

export async function removePost(postId: string, requesterId: string): Promise<void> {
  const post = await findPostById(postId);
  if (!post) throw new NotFoundError("Post not found");
  if (post.authorId !== requesterId) throw new ForbiddenError("Cannot delete another user's post");
  await deletePost(postId);
}

export async function getPost(postId: string): Promise<PublicPost> {
  const post = await findPostById(postId);
  if (!post) throw new NotFoundError("Post not found");
  return toPublicPost(post);
}
