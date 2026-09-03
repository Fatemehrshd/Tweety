# AGENTS.md

This is a monorepo: `frontend/` and `backend/` each have their own `AGENTS.md` with stack-specific rules. **This root file only holds what applies to both sides.** When working inside `frontend/` or `backend/`, follow this file *and* the nested `AGENTS.md` for that folder — the nested one is more specific and wins on any conflict.


## Repo layout
- `frontend/` — web client. Rules: `frontend/AGENTS.md`
- `backend/` — API. Rules: `backend/AGENTS.md`
- `mcp/` — MCP server (agent interface to the backend API, stdio). Rules: `mcp/AGENTS.md`
- Nothing shared lives outside these folders except this file, workspace config, and CI config


## Technology

- Frontend/Application: Next.js
- Backend/Application: Next.js
- Database: PostgreSQL
- ORM / Database Access: TypeORM
- Cache / Session State: Redis
- API Documentation: Swagger / OpenAPI
- Package Manager: pnpm
- Repository: GitLab

## Setup
- pnpm workspaces at the root
- `pnpm install` at root installs all sides
- `pnpm --filter frontend dev` / `pnpm --filter backend dev` to run one side only
- `pnpm --filter mcp build && pnpm --filter mcp start` to run the MCP server (needs the backend running)

## Architecture characteristics
These are non-negotiable for a product-level build, not aspirational. Each has repo-wide rules here and stack-specific rules in the nested files.

### Performance
- No N+1 queries, no unindexed columns on filtered/joined fields
- No unnecessary client-side JS or unoptimized assets shipped to the browser

### Scalability
- No component on either side may hold in-memory state that prevents running multiple instances
- Anything CPU- or time-heavy runs as a background job, never inline in a request/response cycle

### Reliability
- Every external call (API, DB, third-party service) has a timeout and a bounded retry — no unbounded retries, no infinite hangs
- Failure states are handled explicitly, never silently swallowed

### Observability
- A request/trace ID is generated at the edge (backend) and propagated through every log line and downstream call
- Errors are always logged with enough context to debug without reproducing locally
- Both sides report production errors to Sentry — no console-only error handling in production

## Branching
- Two long-lived branches: `main` (production) and `develop` (integration)
- `main` is only ever updated by merging `develop` into it — no direct commits, no feature branch merges straight into `main`
- Feature branches: branch off `develop`, naming `type/short-description` (e.g. `feat/user-auth`, `fix/login-redirect`) — same `type` values as Conventional Commits
- Feature flow: branch off `develop` → PR → merge into `develop`
- Release flow: once `develop` is stable/ready → PR merge `develop` → `main`
- Rebase on `develop` before opening/updating a feature PR
- One feature/fix per branch — small, focused, no bundling unrelated changes
- Delete feature branches after merge into `develop`

## Versioning
- Semantic Versioning (`MAJOR.MINOR.PATCH`)
- Version bump is derived from Conventional Commit types: `fix` → patch, `feat` → minor, a `BREAKING CHANGE` footer → major
- Every merge of `develop` → `main` gets tagged with the resulting version (`vX.Y.Z`)
- - `CHANGELOG.md` is generated from commit history using Changesets, never hand-written

## Commit/PR
- Conventional Commits format
- Run typecheck for whichever side(s) you touched before opening a PR

## Testing
- After implementing a feature: write/update tests covering its core logic (unit for backend logic, component/e2e for frontend flows as appropriate)
- Before proposing a commit: run typecheck + tests for whichever side(s) you touched — `pnpm --filter backend test`, `pnpm --filter frontend test`

## Skills
Don't inline these workflows — call the referenced skill when the situation matches, on either side.
- Design or UI work → `frontend-design` skill
- Reviewing a diff for AI-generated code smell before commit → `deslop` skill
- Proposing architecture refactors (shallow → deep modules) → `improve-codebase-architecture` skill
  - Note: this skill depends on `codebase-design` and `domain-modeling` — install those too or it won't have its vocabulary
- Diagnosing bugs or investigating unexpected behavior → `diagnosing-bugs` skill
