import { NotFoundError, AuthError } from "@/modules/shared/errors";
import { hashPassword, verifyPassword } from "@/modules/shared/bcrypt";
import type { PublicUser, PublicPost, CursorPage } from "@/modules/shared/api-types";
import type { User } from "@/db/entities/User";
import { findUserById, findUserByUsername, updateUser } from "./users.repository";
// Cross-module call via the posts module's exposed service (never its repository).
import { getPostsByAuthor } from "@/modules/posts";
import { saveProfilePicture, deleteProfilePicture } from "./profile-picture.store";

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

export async function getPostsByUsername(
  username: string,
  cursor: string | null,
  limit = 20,
): Promise<CursorPage<PublicPost>> {
  const user = await findUserByUsername(username);
  if (!user) throw new NotFoundError("User not found");
  return getPostsByAuthor(user.id, cursor, limit);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("User not found");

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new AuthError("Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);
  const updated = await updateUser(userId, { passwordHash });
  return toPublicUser(updated);
}

export async function uploadProfilePicture(userId: string, file: File): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("User not found");

  const url = await saveProfilePicture(file);
  try {
    const updated = await updateUser(userId, { profilePictureUrl: url });
    await deleteProfilePicture(user.profilePictureUrl);
    return toPublicUser(updated);
  } catch (err) {
    // Don't orphan the new file if the DB write failed.
    await deleteProfilePicture(url);
    throw err;
  }
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
