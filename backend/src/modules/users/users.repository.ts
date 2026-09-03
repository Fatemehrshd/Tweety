import { getDataSource } from "@/db";
import { User } from "@/db/entities/User";

export async function findUserById(id: string): Promise<User | null> {
  const ds = await getDataSource();
  return ds.getRepository(User).findOne({ where: { id } });
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const ds = await getDataSource();
  return ds.getRepository(User).findOne({ where: { username } });
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "bio" | "profilePictureUrl" | "passwordHash">>,
): Promise<User> {
  const ds = await getDataSource();
  const repo = ds.getRepository(User);
  await repo.update(id, data);
  const updated = await repo.findOneOrFail({ where: { id } });
  return updated;
}
