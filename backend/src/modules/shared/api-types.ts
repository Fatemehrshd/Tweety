/**
 * Public API response shapes. Anything leaving the server is shaped like this —
 * controllers use these as the return type so we don't leak entity internals
 * (e.g. password hashes).
 */

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  bio: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

export interface PublicPostAuthor {
  id: string;
  username: string;
  profilePictureUrl: string | null;
}

export interface PublicPost {
  id: string;
  text: string;
  author: PublicPostAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}
