"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Nav from "@/components/Nav";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/explore");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-5xl font-bold mb-4 text-blue-600">Welcome to Twitter-like</h1>
        <p className="text-xl text-gray-600 mb-8">
          Share your thoughts, follow others, and explore the community.
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/register" className="btn btn-primary">
            Get Started
          </a>
          <a href="/login" className="btn btn-secondary">
            Login
          </a>
        </div>
      </main>
    </div>
  );
}
