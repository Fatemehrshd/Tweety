// This page is server-only - no client bundle needed
export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>Backend API</h1>
      <p>See <a href="/docs">/docs</a> for the interactive API documentation (raw spec: <a href="/api/docs">/api/docs</a>).</p>
      <p>Health check: <a href="/health">/health</a></p>
    </main>
  );
}
