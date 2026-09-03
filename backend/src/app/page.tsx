// This page is server-only - no client bundle needed
export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <h1>Backend API</h1>
      <p>See <a href="/api/docs">/api/docs</a> for the OpenAPI documentation.</p>
      <p>Health check: <a href="/health">/health</a></p>
    </main>
  );
}
