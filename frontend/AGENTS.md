# AGENTS.md — frontend

Applies only within `frontend/`. Also read the root `AGENTS.md` for repo-wide rules (branching, versioning, architecture characteristics, skills).

## Framework

- Next.js
- App Router
- TypeScript
- React

## Code style
- Functional/composition-based components preferred; avoid class-based patterns unless required by the chosen framework
- Client-side interactivity should be opt-in: components default to static/server-rendered when the framework supports it; interactive behavior (state, browser APIs, event handlers) is marked explicitly (e.g. `"use client"` in React, client components in Nuxt, etc.)
- Client-side validation via schema library (Zod, Yup, or equivalent) — this mirrors backend validation, it never replaces it; the backend is the source of truth
- Use Server Components by default; use `"use client"` only when client-side behavior is required

## Performance
- Images served through the framework's optimization layer or a CDN, not raw `<img>` tags for content images
- Route-level code splitting enabled by default; heavy or rarely-used components lazy-loaded via the framework's dynamic import mechanism
- Data fetching prefers server-side/build-time when possible, not client-side fetch for static or cacheable data

## Scalability
- Static or incrementally-generated pages for cacheable content (SSG/ISR/ISG); server-rendered pages only when data is genuinely per-request
- No global client state holds data that should live server-side — the backend stays the source of truth

## Reliability
- Every network call handles loading, error, and empty states explicitly in the UI — no silent failures
- Idempotent GET requests may retry on failure; mutations never auto-retry without user confirmation

## Observability
- Errors are reported to Sentry in production, not just `console.error`
- Any request/trace ID returned by the backend is attached to the corresponding error report for correlation

## Boundaries
- API calls go only through a centralized client module (e.g. `lib/api-client` or `utils/api`), no ad-hoc `fetch` scattered across components
- No direct database or backend-internal imports from the frontend package
