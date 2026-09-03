import { getDataSource } from "@/db";
import { Post } from "@/db/entities/Post";

export async function findPostById(id: string): Promise<Post | null> {
  const ds = await getDataSource();
  return ds.getRepository(Post).findOne({
    where: { id },
    relations: ["author"],
  });
}

export async function findPostsByAuthor(
  authorId: string,
  cursor: string | null,
  limit: number,
): Promise<Post[]> {
  const ds = await getDataSource();
  const qb = ds
    .getRepository(Post)
    .createQueryBuilder("post")
    .leftJoinAndSelect("post.author", "author")
    .where("post.author_id = :authorId", { authorId })
    .orderBy("post.created_at", "DESC")
    .limit(limit + 1); // fetch one extra to detect next page

  if (cursor) {
    qb.andWhere("post.created_at < :cursor", { cursor: new Date(cursor) });
  }

  return qb.getMany();
}

export async function createPost(data: { authorId: string; text: string }): Promise<Post> {
  const ds = await getDataSource();
  const repo = ds.getRepository(Post);
  const post = repo.create({ authorId: data.authorId, text: data.text });
  const saved = await repo.save(post);
  // re-fetch with author relation
  return (await repo.findOne({ where: { id: saved.id }, relations: ["author"] }))!;
}

export async function updatePost(id: string, text: string): Promise<Post> {
  const ds = await getDataSource();
  const repo = ds.getRepository(Post);
  await repo.update(id, { text });
  return (await repo.findOne({ where: { id }, relations: ["author"] }))!;
}

export async function deletePost(id: string): Promise<void> {
  const ds = await getDataSource();
  await ds.getRepository(Post).delete(id);
}
