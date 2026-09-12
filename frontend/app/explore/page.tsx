"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { api, type Post } from "@/lib/api-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PostListSkeleton, PostSkeleton } from "@/components/PostSkeleton";

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [moreError, setMoreError] = useState("");

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { items, nextCursor: cursor } = await api.getExploreFeed();
      setPosts(items);
      setNextCursor(cursor);
      setLoadError("");
    } catch (err) {
      console.error("Failed to load explore feed:", err);
      setLoadError("We couldn't load the feed. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setMoreError("");
    try {
      const { items, nextCursor: cursor } = await api.getExploreFeed(nextCursor);
      setPosts([...posts, ...items]);
      setNextCursor(cursor);
    } catch (err) {
      console.error("Failed to load more posts:", err);
      setMoreError("We couldn't load more posts. Try again.");
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
          <PostListSkeleton />
        ) : loadError ? (
          <Alert variant="destructive">
            <div>
              <AlertTitle>Feed unavailable</AlertTitle>
              <AlertDescription className="mt-3 flex items-center justify-between gap-3">
                <span>{loadError}</span>
                <button onClick={loadPosts} className="btn btn-secondary text-sm shrink-0">
                  Try again
                </button>
              </AlertDescription>
            </div>
          </Alert>
        ) : posts.length === 0 ? (
          <p className="text-gray-500 text-center">No posts yet. Be the first to post!</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="card">
                <div className="flex items-start gap-3">
                  {post.author.profilePictureUrl && (
                    <Link href={`/users/${post.author.username}`}>
                      <img
                        src={post.author.profilePictureUrl}
                        alt={post.author.username}
                        className="w-10 h-10 rounded-full object-cover hover:opacity-80"
                      />
                    </Link>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/users/${post.author.username}`}
                        className="font-semibold hover:underline"
                      >
                        @{post.author.username}
                      </Link>
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
            {isLoadingMore && <PostSkeleton />}
            {moreError && (
              <Alert variant="destructive">
                <div>
                  <AlertTitle>Pagination failed</AlertTitle>
                  <AlertDescription className="mt-3 flex items-center justify-between gap-3">
                    <span>{moreError}</span>
                    <button onClick={loadMore} className="btn btn-secondary text-sm shrink-0">
                      Try again
                    </button>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
