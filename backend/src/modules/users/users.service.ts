import { NotFoundError } from "@/modules/shared/errors";
import type { PublicUser } from "@/modules/shared/api-types";
import type { User } from "@/db/entities/User";
import { findUserById, findUserByUsername, updateUser } from "./users.repository";

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    bio: user.bio,
    profilePictureUrl: user.profilePictureUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getProfileByUsername(username: string): Promise<PublicUser> {
  const user = await findUserByUsername(username);
  if (!user) throw new NotFoundError("User not found");
  return toPublicUser(user);
}

export async function getProfileById(id: string): Promise<PublicUser> {
  const user = await findUserById(id);
  if (!user) throw new NotFoundError("User not found");
  return toPublicUser(user);
}

export async function updateProfile(
  userId: string,
  data: { bio?: string | null; profilePictureUrl?: string | null },
): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("User not found");

  const updated = await updateUser(userId, {
    ...(data.bio !== undefined ? { bio: data.bio } : {}),
    ...(data.profilePictureUrl !== undefined ? { profilePictureUrl: data.profilePictureUrl } : {}),
  });
  return toPublicUser(updated);
}
