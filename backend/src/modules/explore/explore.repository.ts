import { getDataSource } from "@/db";
import { Post } from "@/db/entities/Post";

export async function findAllPostsPaginated(
  cursor: string | null,
  limit: number,
): Promise<Post[]> {
  const ds = await getDataSource();
  const qb = ds
    .getRepository(Post)
    .createQueryBuilder("post")
    .leftJoinAndSelect("post.author", "author")
    .orderBy("post.created_at", "DESC")
    .limit(limit + 1); // one extra to detect next page

  if (cursor) {
    qb.where("post.created_at < :cursor", { cursor: new Date(cursor) });
  }

  return qb.getMany();
}
