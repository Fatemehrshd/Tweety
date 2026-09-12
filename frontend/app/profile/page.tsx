"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api, ApiError } from "@/lib/api-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user, accessToken, isLoading, refreshAuth } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      setBio(user.bio ?? "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setError("");
    setIsSubmitting(true);

    try {
      await api.updateMe(accessToken, { bio: bio || null });
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setUploadError("Please choose a JPEG, PNG, WebP, or GIF image.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be at most 5 MB.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!accessToken || !selectedFile) return;
    setUploadError("");
    setIsUploading(true);
    try {
      await api.uploadProfilePicture(accessToken, selectedFile);
      await refreshAuth();
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.changePassword(accessToken, { currentPassword, newPassword });
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-8" aria-busy="true">
          <div className="card flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </main>
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
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
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
                <span className="block text-sm font-medium mb-1">Profile Picture</span>
                <div className="flex items-center gap-4">
                  {(previewUrl ?? user.profilePictureUrl) ? (
                    <img
                      src={previewUrl ?? user.profilePictureUrl ?? ""}
                      alt="Profile preview"
                      className="w-16 h-16 rounded-full object-cover bg-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      id="avatar"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={handleUpload}
                      className="btn btn-secondary text-sm"
                      disabled={!selectedFile || isUploading}
                    >
                      {isUploading ? "Uploading..." : "Upload Picture"}
                    </button>
                  </div>
                </div>
                {uploadError && <p className="text-red-700 text-sm mt-2">{uploadError}</p>}
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
                    setSelectedFile(null);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setUploadError("");
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

        <div className="card mt-6">
          <h2 className="text-xl font-bold mb-4">Change Password</h2>
          {passwordError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          {passwordSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              {passwordSuccess}
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                minLength={8}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
              {isChangingPassword ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
