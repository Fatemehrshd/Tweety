"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

const focusRing =
  "w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

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
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-500">Tweety</h1>
        <p className="mt-2 mb-8 text-sm text-gray-600">
          Share what&apos;s on your mind — 280 characters at a time.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/register" className={`btn btn-primary ${focusRing}`}>
            Create account
          </Link>
          <Link href="/login" className={`btn btn-secondary ${focusRing}`}>
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
