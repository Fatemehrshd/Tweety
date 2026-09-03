"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api, ApiError } from "@/lib/api-client";

export default function ProfilePage() {
  const { user, accessToken, isLoading, refreshAuth } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      setBio(user.bio ?? "");
      setProfilePictureUrl(user.profilePictureUrl ?? "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setError("");
    setIsSubmitting(true);

    try {
      await api.updateMe(accessToken, {
        bio: bio || null,
        profilePictureUrl: profilePictureUrl || null,
      });
      await refreshAuth();
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update profile. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
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
        <div className="card">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">@{user.username}</h1>
              <p className="text-gray-600 text-sm">{user.email}</p>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="btn btn-secondary text-sm">
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input"
                  rows={3}
                  maxLength={160}
                  placeholder="Tell us about yourself..."
                />
                <p className="text-xs text-gray-500 mt-1">{bio.length} / 160</p>
              </div>
              <div>
                <label htmlFor="profilePictureUrl" className="block text-sm font-medium mb-1">
                  Profile Picture URL
                </label>
                <input
                  id="profilePictureUrl"
                  type="url"
                  value={profilePictureUrl}
                  onChange={(e) => setProfilePictureUrl(e.target.value)}
                  className="input"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setBio(user.bio ?? "");
                    setProfilePictureUrl(user.profilePictureUrl ?? "");
                    setError("");
                  }}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {user.profilePictureUrl && (
                <img
                  src={user.profilePictureUrl}
                  alt={`${user.username}'s profile`}
                  className="w-24 h-24 rounded-full object-cover"
                />
              )}
              {user.bio && <p className="text-gray-700">{user.bio}</p>}
              {!user.bio && !user.profilePictureUrl && (
                <p className="text-gray-500 text-sm italic">No bio or profile picture set yet.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
