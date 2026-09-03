import { getDataSource } from "@/db";

// This is server-only - no client bundle
export const dynamic = 'force-static';

// Initialize DB connection on server startup (lazy init handled by getDataSource)
getDataSource().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[layout] Failed to initialize DB:", err);
});

export const metadata = {
  title: "Twitter-like API",
  description: "Backend API for Twitter-like social network",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
