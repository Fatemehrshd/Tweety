import { getDataSource } from "@/db";
import { User } from "@/db/entities/User";

export async function findUserByEmail(email: string): Promise<User | null> {
  const ds = await getDataSource();
  return ds.getRepository(User).findOne({ where: { email: email.toLowerCase() } });
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const ds = await getDataSource();
  return ds.getRepository(User).findOne({ where: { username } });
}

export async function findUserById(id: string): Promise<User | null> {
  const ds = await getDataSource();
  return ds.getRepository(User).findOne({ where: { id } });
}

export async function createUser(data: {
  email: string;
  username: string;
  passwordHash: string;
}): Promise<User> {
  const ds = await getDataSource();
  const repo = ds.getRepository(User);
  const user = repo.create({
    email: data.email.toLowerCase(),
    username: data.username,
    passwordHash: data.passwordHash,
    bio: null,
    profilePictureUrl: null,
  });
  return repo.save(user);
}
