const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    token?: string;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include", // send cookies (refresh token)
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      details?: unknown;
    };
    throw new ApiError(
      res.status,
      errorData.code ?? "UNKNOWN_ERROR",
      errorData.message ?? "Request failed",
      errorData.details,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  register: (data: { email: string; username: string; password: string }) =>
    request<{ accessToken: string; user: User }>("POST", "/api/auth/register", { body: data }),
  login: (data: { email: string; password: string }) =>
    request<{ accessToken: string; user: User }>("POST", "/api/auth/login", { body: data }),
  refresh: () => request<{ accessToken: string; user: User }>("POST", "/api/auth/refresh"),
  logout: () => request<void>("POST", "/api/auth/logout"),

  // Users
  getMe: (token: string) => request<User>("GET", "/api/users/me", { token }),
  updateMe: (token: string, data: { bio?: string | null; profilePictureUrl?: string | null }) =>
    request<User>("PATCH", "/api/users/me", { token, body: data }),
  getUserByUsername: (username: string) => request<User>("GET", `/api/users/${username}`),
  getUserPosts: (username: string, cursor?: string, limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return request<CursorPage<Post>>("GET", `/api/users/${username}/posts?${params}`);
  },

  // Posts
  getMyPosts: (token: string, cursor?: string, limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return request<CursorPage<Post>>("GET", `/api/posts?${params}`, { token });
  },
  createPost: (token: string, text: string) =>
    request<Post>("POST", "/api/posts", { token, body: { text } }),
  getPost: (id: string) => request<Post>("GET", `/api/posts/${id}`),
  updatePost: (token: string, id: string, text: string) =>
    request<Post>("PATCH", `/api/posts/${id}`, { token, body: { text } }),
  deletePost: (token: string, id: string) =>
    request<void>("DELETE", `/api/posts/${id}`, { token }),

  // Explore
  getExploreFeed: (cursor?: string, limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return request<CursorPage<Post>>("GET", `/api/explore?${params}`);
  },
};

// Type definitions matching the backend PublicUser, PublicPost
export interface User {
  id: string;
  email: string;
  username: string;
  bio: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

export interface Post {
  id: string;
  text: string;
  author: {
    id: string;
    username: string;
    profilePictureUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
