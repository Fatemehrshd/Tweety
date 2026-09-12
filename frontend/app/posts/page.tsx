"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api, type Post, ApiError } from "@/lib/api-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PostListSkeleton } from "@/components/PostSkeleton";

export default function PostsPage() {
  const { user, accessToken, isLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (accessToken) {
      loadPosts();
    }
  }, [accessToken]);

  const loadPosts = async () => {
    if (!accessToken) return;
    try {
      const { items } = await api.getMyPosts(accessToken);
      setPosts(items);
      setLoadError("");
    } catch (err) {
      console.error("Failed to load posts:", err);
      setLoadError("We couldn't load your posts. Check your connection and try again.");
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newPostText.trim()) return;

    setError("");
    setIsSubmitting(true);

    try {
      const newPost = await api.createPost(accessToken, newPostText);
      setPosts([newPost, ...posts]);
      setNewPostText("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create post. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditText(post.text);
    setError("");
  };

  const handleUpdate = async (postId: string) => {
    if (!accessToken || !editText.trim()) return;

    setError("");
    setIsSubmitting(true);

    try {
      const updated = await api.updatePost(accessToken, postId, editText);
      setPosts(posts.map((p) => (p.id === postId ? updated : p)));
      setEditingPostId(null);
      setEditText("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update post. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!accessToken || !confirm("Delete this post?")) return;

    try {
      await api.deletePost(accessToken, postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="card">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="mb-3 h-20 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
          <PostListSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Create a new post</h2>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              className="input"
              rows={3}
              maxLength={280}
              placeholder="What's on your mind?"
              required
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{newPostText.length} / 280</span>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !newPostText.trim()}>
                {isSubmitting ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">My Posts</h2>
          {loadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{loadError}</span>
                <button onClick={loadPosts} className="btn btn-secondary text-sm shrink-0">
                  Try again
                </button>
              </AlertDescription>
            </Alert>
          )}
          {isLoadingPosts ? (
            <PostListSkeleton />
          ) : posts.length === 0 ? (
            <p className="text-gray-500 text-center">No posts yet. Create your first post above!</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="card">
                  {editingPostId === post.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="input"
                        rows={3}
                        maxLength={280}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(post.id)}
                          className="btn btn-primary text-sm"
                          disabled={isSubmitting}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingPostId(null);
                            setEditText("");
                            setError("");
                          }}
                          className="btn btn-secondary text-sm"
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-900 mb-2">{post.text}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{new Date(post.createdAt).toLocaleString()}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(post)} className="text-blue-600 hover:underline">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(post.id)} className="text-red-600 hover:underline">
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
