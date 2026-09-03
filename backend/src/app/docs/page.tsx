"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
      <SwaggerUI url="/api/docs" />
    </main>
  );
}
