import { randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "@/modules/shared/bcrypt";
import { signAccessToken } from "@/modules/shared/jwt";
import { storeRefreshToken, rotateRefreshToken, deleteRefreshToken, getRefreshTokenUserId } from "@/modules/shared/redis";
import { ConflictError, AuthError } from "@/modules/shared/errors";
import type { AuthResponse, PublicUser } from "@/modules/shared/api-types";
import {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
} from "./auth.repository";
import type { User } from "@/db/entities/User";

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    bio: user.bio,
    profilePictureUrl: user.profilePictureUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

function generateRefreshToken(): string {
  return randomBytes(40).toString("hex");
}

export async function register(data: {
  email: string;
  username: string;
  password: string;
}): Promise<{ authResponse: AuthResponse; refreshToken: string }> {
  const [existingEmail, existingUsername] = await Promise.all([
    findUserByEmail(data.email),
    findUserByUsername(data.username),
  ]);

  if (existingEmail) throw new ConflictError("Email already in use");
  if (existingUsername) throw new ConflictError("Username already taken");

  const passwordHash = await hashPassword(data.password);
  const user = await createUser({ email: data.email, username: data.username, passwordHash });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, username: user.username });
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(refreshToken, user.id);

  return { authResponse: { accessToken, user: toPublicUser(user) }, refreshToken };
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<{ authResponse: AuthResponse; refreshToken: string }> {
  const user = await findUserByEmail(data.email);
  if (!user) throw new AuthError("Invalid email or password");

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) throw new AuthError("Invalid email or password");

  const accessToken = signAccessToken({ sub: user.id, email: user.email, username: user.username });
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(refreshToken, user.id);

  return { authResponse: { accessToken, user: toPublicUser(user) }, refreshToken };
}

export async function refresh(oldRefreshToken: string): Promise<{ authResponse: AuthResponse; refreshToken: string }> {
  const userId = await getRefreshTokenUserId(oldRefreshToken);
  if (!userId) throw new AuthError("Invalid or expired refresh token");

  const user = await findUserById(userId);
  if (!user) throw new AuthError("User not found");

  const accessToken = signAccessToken({ sub: user.id, email: user.email, username: user.username });
  const refreshToken = generateRefreshToken();
  await rotateRefreshToken(oldRefreshToken, refreshToken, user.id);

  return { authResponse: { accessToken, user: toPublicUser(user) }, refreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  await deleteRefreshToken(refreshToken);
}
