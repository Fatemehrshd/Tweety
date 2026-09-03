"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// swagger-ui touches browser APIs during render, so it must skip the server
// prerender — otherwise Next.js serves an empty page.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
      <SwaggerUI url="/api/docs" />
    </main>
  );
}
