"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { api, ApiError, type User, type Post } from "@/lib/api-client";

export default function UserProfilePage() {
  const params = useParams();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    loadProfile(username);
  }, [username]);

  const loadProfile = async (name: string) => {
    setIsLoading(true);
    setError("");
    try {
      const [profile, page] = await Promise.all([
        api.getUserByUsername(name),
        api.getUserPosts(name),
      ]);
      setUser(profile);
      setPosts(page.items);
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setError("User not found.");
      } else {
        setError("Failed to load profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!username || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await api.getUserPosts(username, nextCursor);
      setPosts([...posts, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError("Failed to load more posts. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {error && !user ? (
          <div className="card text-center">
            <p className="text-gray-700 mb-4">{error}</p>
            <Link href="/explore" className="text-blue-600 hover:underline text-sm">
              Back to Explore
            </Link>
          </div>
        ) : (
          user && (
            <>
              <div className="card mb-6">
                <div className="flex items-center gap-4">
                  {user.profilePictureUrl && (
                    <img
                      src={user.profilePictureUrl}
                      alt={`${user.username}'s profile`}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold">@{user.username}</h1>
                    {user.bio ? (
                      <p className="text-gray-700 mt-1">{user.bio}</p>
                    ) : (
                      <p className="text-gray-500 text-sm italic mt-1">No bio yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold mb-4">Posts</h2>
              {posts.length === 0 ? (
                <p className="text-gray-500 text-center">No posts yet.</p>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="card">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-500">
                          {new Date(post.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-900">{post.text}</p>
                    </div>
                  ))}
                  {nextCursor && (
                    <div className="text-center pt-4">
                      <button onClick={loadMore} className="btn btn-secondary" disabled={isLoadingMore}>
                        {isLoadingMore ? "Loading..." : "Load More"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}
