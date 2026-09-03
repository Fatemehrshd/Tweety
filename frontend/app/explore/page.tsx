"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";
import { api, type Post } from "@/lib/api-client";

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { items, nextCursor: cursor } = await api.getExploreFeed();
      setPosts(items);
      setNextCursor(cursor);
    } catch (err) {
      console.error("Failed to load explore feed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const { items, nextCursor: cursor } = await api.getExploreFeed(nextCursor);
      setPosts([...posts, ...items]);
      setNextCursor(cursor);
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Explore</h1>
        {isLoading ? (
          <div className="text-center text-gray-600">Loading...</div>
        ) : posts.length === 0 ? (
          <p className="text-gray-500 text-center">No posts yet. Be the first to post!</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="card">
                <div className="flex items-start gap-3">
                  {post.author.profilePictureUrl && (
                    <img
                      src={post.author.profilePictureUrl}
                      alt={post.author.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">@{post.author.username}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(post.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-900">{post.text}</p>
                  </div>
                </div>
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
      </main>
    </div>
  );
}
