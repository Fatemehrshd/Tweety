# Project Report — Twitter-like Social Network MVP

Companion to the root `README.md` (setup + daily use). This document is the **onboarding brain-dump**:
what was built, how it hangs together, and — for every load-bearing choice — **what the alternatives were
and why this one won**. All claims below were verified against the code cited in each section.

Scope: Phase 1 (users, posts, explore) + the MCP agent interface. There is **no Audit Log and no Admin
Panel/role** in the codebase today — §10 records that as an explicit gap with a proposed design.

---

## 1. Executive summary

A modular-monolith MVP: one Next.js API backend (`backend/`, :4000) + one Next.js web client (`frontend/`,
:3000) + one MCP server (`mcp/`, stdio/HTTP) exposing the same backend API to AI agents. PostgreSQL (TypeORM)
is the source of truth; Redis holds refresh-token/session state and backs the health check; Swagger/OpenAPI is
generated from Zod schemas so docs cannot drift from code.

Delivered: JWT auth with rotation, profiles (bio/avatar/password), own-post CRUD with ownership enforcement,
public profiles, cursor-paginated global feed, avatar upload, health endpoint, request-ID tracing, structured
logging with secret redaction, 13 MCP tools with session isolation, and per-package typechecks.

---

## 2. System map (as built)

```
Browser (:3000, frontend/) ──fetch──▶ API (:4000, backend/src/app/api/...)
  │ api-client.ts (sole HTTP layer)      │ middleware.ts: CORS + X-Request-ID
  │ AuthContext (token in memory)        │ withRequest (AsyncLocalStorage ctx)
                                         │ → service (logic) → repository (TypeORM) → PostgreSQL
                                         │ refresh-token state → Redis (30 d TTL)
                                         │ GET /api/docs (OpenAPI JSON) + /docs (Swagger UI)
                                         │ GET /health { db, redis }

AI agent ──MCP──▶ mcp/src/server.ts ──fetch (10 s timeout)──▶ same backend HTTP API
  stdio (one client) or Streamable HTTP (one session per MCP session id)
  sessions in process memory; one silent refresh on 401
```

**Modules (backend):** `auth` (register/login/refresh/logout) · `users` (profile/password/avatar) ·
`posts` (CRUD + `toPublicPost`) · `explore` (global feed, reuses posts' mapper) · `shared`
(`api-types`, `jwt`, `redis`, `bcrypt`, `cookie`, `validate`, `errors`, `error-handler`, `logger`,
`swagger`, `request-context`). Routes in `src/app/api/**` are thin: validate → `requireAuth()` →
service → `NextResponse.json`. Repositories are the only files importing the DataSource.

**Pages (frontend):** `/` (landing → `/explore` when logged in) · `/login` · `/register` · `/explore`
(public feed + Load More) · `/posts` (own posts + create/edit/delete) · `/profile` (bio/avatar/password) ·
`/users/[username]` (public profile + their posts). `Nav` is auth-aware; `AuthContext` owns the session.

---

## 3. Decision log — defended choice by choice

### 3.1 One language, two Next.js apps (modular monolith)

**Chosen:** TypeScript everywhere; Next.js App Router for *both* frontend and backend (Route Handlers).
**Alternatives:** (a) separate backend framework (Express/Nest/Fastify); (b) two repos; (c) microservices per feature.
**Why this won:** a 5–6-hour MVP budget rewards one toolchain, shared DTO vocabulary (`PublicUser`/`PublicPost`
mirrored in frontend + MCP), and App Router co-location of routes with the Swagger registry. A monolith has no
distributed-transaction/auth-propagation cost at this scale; services are already stateless (Postgres/Redis hold
state), so extraction later is a packaging change, not a rewrite. Microservices would add deployment, tracing, and
failure-mode surface with zero product benefit at MVP size.

### 3.2 PostgreSQL as the source of truth

**Chosen:** Postgres for users + posts, with uniqueness and check constraints in the schema
(`uq_users_email`, `uq_users_username`, `CHK_posts_text`, `idx_posts_created_at`, `idx_posts_author_id`,
`FK_posts_author_id ON DELETE CASCADE`).
**Alternatives:** SQLite (zero-ops), MySQL (familiar), MongoDB (schemaless speed).
**Why this won:** the domain is relational (users→posts, ownership joins, newest-first ordering) and needs real
constraints under concurrency — e.g. duplicate-email races are decided by the unique index, not by two
`SELECT`-then-`INSERT` services. Postgres gives `timestamptz` ordering, UUID PKs, and a migration story that
SQLite file DBs and schemaless stores cannot match for production. Cost: you must run Postgres (see health-check
§3.11) — accepted because data integrity outranks zero-ops for a social graph.

### 3.3 TypeORM (migrations generated, never hand-written)

**Chosen:** TypeORM entities (`User`, `Post`) + repositories + generated migrations (`migration:generate` →
`src/migrations/*`, `synchronize: false`).
**Alternatives:** Prisma (better DX/migrations), Drizzle (lighter), raw SQL/`pg` (full control).
**Why this won:** the brief mandates TypeORM; within that constraint the repo squeezes out the safe subset —
explicit column types on every field, function-form relation targets (`() => User`) so production minification
can't break relations, `emitDecoratorMetadata: false` to dodge the classic `User ↔ Post` circular-import crash,
and a hard rule: migrations come from the TypeORM diff, raw SQL is never hand-edited. Prisma would have been a
legitimate DX-first pick on a green field, but switching ORMs mid-MVP buys nothing once the entity/repository
boundary is respected.

### 3.4 Redis — refresh tokens and health, nothing else (the headline question)

**Where Redis is used (exactly two roles):**
1. **Refresh-token / session state** — `storeRefreshToken / getRefreshTokenUserId / deleteRefreshToken /
   rotateRefreshToken` under `refresh:<token>` keys with 30-day TTL (`backend/src/modules/shared/redis.ts`).
2. **Liveness signal** — `GET /health` pings Redis alongside `SELECT 1` on Postgres.

**Where Redis is NOT used:** no business data, no post/feed caching, no pub/sub, no queue yet.

**Alternatives considered:**
- *Postgres table for refresh tokens* — durable and queryable, but every request-adjacent auth check pays a
  disk-backed lookup, and expiry needs a sweep job; revocation lists are textbook TTL data.
- *Stateless JWT refresh (no server store)* — rotation/revocation becomes impossible; logout is a client-side
  fiction and stolen refresh tokens stay valid until expiry.
- *In-memory Map in Node* — breaks the moment you run two backend instances (the repo's scalability rule
  forbids instance-local session state) and evaporates on restart.
- *Caching feeds/posts in Redis now* — premature: the feed is a single indexed `ORDER BY created_at DESC`
  query; a cache would add invalidation obligations (explicit on write, per AGENTS.md) before any measured need.

**Why Redis won:** refresh tokens need *fast lookup + natural expiry + shared-across-instances + trivial
revocation* — precisely Redis-with-TTL's shape (`SET … EX`, `DEL`, pipelined rotation). Postgres stays the
source of truth for everything that must survive and be queried relationally; Redis stays an expirable,
losable session layer. If Redis is flushed, users re-login — no business data is lost. That asymmetry is the
whole argument, and the `/health` check makes the dependency visible instead of silent.

### 3.5 Auth: 15-min JWT access + rotating opaque refresh in an httpOnly cookie

**Chosen:** `signAccessToken({ sub, email, username })` (15 min) in `Authorization: Bearer`; opaque 80-hex-char
refresh token in `refresh_token` cookie (`HttpOnly; SameSite=Lax; Path=/api/auth; Secure` in prod, 30 d max-age);
rotation on every use (`multi: DEL old + SET new EX`); Redis tracks validity; `requireAuth()` re-verifies the
access token per request from `AsyncLocalStorage`.
**Alternatives:** tokens in `localStorage` (simple, XSS-stealable); long-lived access tokens (fewer refreshes,
bigger blast radius); non-rotating refresh (replayable); server sessions in Postgres (durable but heavy).
**Why this won:** short access bounds theft; httpOnly cookies keep refresh out of JS reach; rotation means a
stolen refresh token races its legitimate owner and the loser is invalidated; Redis gives O(1) revocation and
auto-expiry. Cookie `Path=/api/auth` scopes the token to auth routes only; `SameSite=Lax` + `Secure`-in-prod
is the standard CSRF/leak posture for a first-party web client with `credentials: "include"`.

### 3.6 Passwords: bcryptjs, cost 12

**Chosen:** `bcrypt.hash(plain, 12)` / `bcrypt.compare` (`modules/shared/bcrypt.ts`); hashes only (`password_hash`),
never returned (public mappers strip it).
**Alternatives:** argon2id (stronger, native bindings), scrypt, cost 10 (faster) / 14 (slower).
**Why this won:** AGENTS.md mandates cost ≥ 12; bcryptjs is pure-JS (no native build pain in Next.js serverless/
container builds) and 12 is the accepted 2025-era cost/performance knee. Argon2id would be defensible for a
security-hardened v2, but it adds build complexity for marginal gain at MVP scale. Passwords are additionally
excluded from logs by pino `redact` paths and from every API shape by construction.

### 3.7 Feature modules, not layers (route → service → repository)

**Chosen:** `modules/<feature>/` owning its schemas, service, repository, openapi, and `index.ts` facade;
`shared/` holds only cross-cutting code; cross-module reads go through services (`users` → `posts`
`getPostsByAuthor`), never repositories.
**Alternatives:** global `services/`, `repositories/`, `controllers/` layers; or fully isolated microservices.
**Why this won:** feature folders keep the blast radius of a change inside one directory (see `detect_changes`
expectations), enforce the "services never import the ORM" seam for testability, and make ownership checks
(`post.authorId !== requesterId → 403`) live next to the logic they guard. Layers scatter one feature across
three directories and invite repository-grabbing shortcuts; microservices reintroduce network boundaries the
product doesn't need yet.

### 3.8 Validation + docs from the same Zod schema (Swagger never drifts)

**Chosen:** every input parsed by Zod (`parseJsonBody/parseQuery/parseParams` → `ValidationError` 400 with
flattened details); the same schemas registered via `@asteasolutions/zod-to-openapi` into one `registry`;
`GET /api/docs` generates the OpenAPI 3.1 JSON; `/docs` renders Swagger UI. Adding a route without its
`*.openapi.ts` entry is a review failure.
**Alternatives:** class-validator + decorators; hand-maintained `openapi.yaml`; docs-as-afterthought.
**Why this won:** one schema is simultaneously the runtime guard, the TypeScript type (`z.infer`), and the
documented contract — drift is structurally impossible. A separate YAML spec always rots; decorators split the
contract across two syntaxes. Cost: contributors must learn the `registry.registerPath` idiom, which the
existing `auth/posts/users/explore.openapi.ts` files exemplify.

### 3.9 Cursor pagination + join-on-read (no N+1, no unbounded SELECT)

**Chosen:** `cursor` (ISO timestamp) + `limit` (1–100, default 20), fetch `limit+1` to compute `nextCursor`;
`leftJoinAndSelect("post.author")` in both post queries; indexes on `posts.created_at` and `author_id`.
**Alternatives:** offset/limit (simple, skips/duplicates under concurrent inserts, degrades on deep pages);
unbounded lists; lazy relations (N+1).
**Why this won:** a social feed is an append-heavy, newest-first stream — cursor-on-`created_at` is stable where
offset is not, and `limit+1` avoids a separate `COUNT(*)`. Joining the author in the same query keeps every feed
render at one round-trip, and the two indexes make both access patterns (`global newest`, `by author newest`)
index-ordered. Offset pagination would be fine for an admin table with stable snapshots — not for a live feed.

### 3.10 Observability: request IDs, typed errors, redacting logger

**Chosen:** Edge `middleware.ts` mints/propagates `X-Request-ID` → `request-context.ts` (`AsyncLocalStorage`)
carries `{ requestId, userId, username, email }` → every log line and every error payload includes it;
all failures are typed `AppError` subclasses rendered centrally (`{ code, message, details?, requestId }`
with correct status); pino logs structured, pretty in dev, with `redact` paths for
passwords/tokens/`Authorization`.
**Alternatives:** `console.log` tracing, raw-string throws, per-handler try/catch, no correlation IDs.
**Why this won:** correlation IDs turn "it 500'd" into a one-grep diagnosis across frontend→backend→DB/Redis;
typed errors make status codes a property of the domain (401 vs 403 vs 404 vs 409) rather than handler folklore;
redaction makes "never log secrets" enforceable instead of aspirational. The one honesty note: Sentry reporting
is a stated AGENTS.md requirement but **no Sentry SDK is wired in either app today** — errors are logged, not
reported off-box (see §9).

### 3.11 Health + deployment posture

**Chosen:** `GET /health` returns `{ status: healthy|degraded, checks: { db, redis } }` with 503 on degradation;
backend `next.config.ts` marks `typeorm/pg/ioredis/bcryptjs/pino` as `serverExternalPackages` with client
fallbacks (`fs/net/tls/crypto: false`).
**Alternatives:** no health endpoint; TCP-only checks; bundling server deps to the client.
**Why this won:** the deploy pipeline needs a gate that actually exercises both runtime dependencies
(`SELECT 1` + `PING`), and degraded-503 (rather than 200-with-a-flag) keeps bad instances out of rotation.
The webpack/external config is load-bearing: without it, server-only drivers get bundled into client chunks.

### 3.12 Frontend: App Router + minimal client JS, one API layer

**Chosen:** Next.js App Router; `"use client"` only where interactivity demands (all current pages are client
because they hold session/forms); `lib/api-client.ts` is the sole fetch site (`api.*`, `ApiError`,
`credentials: "include"`, FormData-aware); client validation (zod-compatible attributes, file type/size checks)
mirrors but never replaces server validation; every call renders loading/error/empty; mutations never auto-retry.
**Alternatives:** ad-hoc `fetch` per component; global stores duplicating server state; auto-retrying mutations.
**Why this won:** one client module means auth headers, cookie mode, and error mapping change in one place;
server remains source of truth so refresh races resolve consistently; no-retry-on-mutate avoids double-posts on
flaky networks (idempotent GETs may retry). `swr` is installed but pages currently use direct `useEffect` loads —
adopting it for feed caching/dedup is reasonable future work, not a current dependency.

### 3.13 Avatars on local disk behind a module boundary

**Chosen:** `users/profile-picture.store.ts` validates (MIME allowlist, 5 MB), writes to
`backend/public/uploads/<uuid>.<ext>`, returns `${PUBLIC_BASE_URL}/uploads/<file>`; old avatars deleted
best-effort (logged, never fatal); `basename()` blocks path traversal; client pre-validates the same rules.
**Alternatives:** S3/GCS + CDN (durable, multi-instance-safe); storing blobs in Postgres (simple, bloats DB).
**Why this won:** zero-infrastructure avatars for an MVP with the seam already drawn — swapping the store module
for an S3 implementation changes no service or route. The trade-off is stated openly: local disk does **not**
survive multi-instance deploys or ephemeral filesystems, so object storage is the first infra upgrade when
horizontal scaling matters.

### 3.14 MCP: thin interface, two transports, isolated sessions

**Chosen:** MCP owns no product logic — `api.ts` (10 s `AbortSignal.timeout`, exactly one retry on network
failure, never on 4xx) + `session.ts` (in-memory, one entry per client: `"stdio"` for stdio, one per MCP session
id for HTTP) + Zod-validated tools mirroring `api-types.ts` shapes only. Login resolves username→email via the
public profile (which makes username existence visible, same as the site). Avatar upload excluded deliberately
(binary over stdio); `users_update_me` covers the URL case.
**Alternatives:** direct DB access from MCP; duplicated auth/business logic; shared global token; stdio-only.
**Why this won:** the HTTP API stays the single source of behavior — backend fixes propagate to agents for free,
and the boundary (`never import from backend/ or frontend/`) is checkable in review. Per-client sessions prevent
cross-agent token leaks; the single-401-refresh mirrors the web client without unbounded retry storms; adding
Streamable HTTP alongside stdio covers remote clients while defaulting to localhost-bound + 4 MB-capped so the
networked mode isn't accidentally internet-facing. Protocol tests (`api/session/tools.test.ts`, stubbed backend,
including the cross-user-edit → 403 case) exist precisely because this seam is trust-critical.

### 3.15 pnpm workspaces, shared TS base, typecheck-as-gate

**Chosen:** pnpm workspaces (`backend`, `frontend`, `mcp`, agent skills); `tsconfig.base.json` (`strict`,
`noUncheckedIndexedAccess`, `isolatedModules`); per-package `typecheck` scripts run before PRs.
**Alternatives:** npm/yarn, per-package tsconfigs drifting apart, tests-only gates.
**Why this won:** pnpm gives fast, disk-efficient, strictly-resolved installs across three packages with one
lockfile; the shared base keeps strictness uniform so `undefined`-shaped bugs fail at compile time in all three
runtimes. Typecheck-as-gate is the honest minimum given backend/frontend have no unit suites yet (below).

---

## 4. Data design

**`users`:** `id uuid PK` · `email varchar(255)` unique (lowercased before save/query — case-insensitive
uniqueness without the `citext` extension) · `username varchar(64)` unique · `password_hash text` ·
`bio text?` · `profile_picture_url text?` · `created_at/updated_at timestamptz`.
**`posts`:** `id uuid PK` · `author_id uuid FK → users.id ON DELETE CASCADE` · `text text`
(`CHECK text <> '' AND length <= 280`, mirrored by Zod `min(1).max(280)`) · `created_at/updated_at`.
**Indexes:** `uq_users_email`, `uq_users_username`, `idx_posts_created_at`, `idx_posts_author_id` — every
filtered/joined column in the read paths is indexed, per the repo performance rule.
**Migrations:** generated (`migration:generate`), reviewed, applied (`migration:run`); `synchronize: false`
always — the DB schema is never inferred from entities at runtime.

---

## 5. API surface (implemented)

Swagger UI `http://localhost:4000/api/docs` · JSON `GET /api/docs`. Auth + Users + Posts + Explore + Health
as tabulated in the README §8. Uniform error envelope
`{ code, message, details?, requestId }`; lists return `{ items, nextCursor }` with `limit` 1–100 (default 20).

---

## 6. Verification performed for this report

- Read root + `frontend/` + `backend/` + `mcp/` AGENTS.md/CLAUDE.md-equivalents, `docs/phase 1.md`, both `.env`
  files, workspace + tsconfigs, both `next.config.ts` files.
- Traced backend: `middleware.ts` → all `src/app/api/**` routes → `auth/users/posts/explore` services →
  repositories → `User`/`Post` entities → `InitialSchema` migration; `jwt/redis/bcrypt/cookie/validate/errors/
  error-handler/logger/swagger/request-context/api-types` shared modules; `health`, `docs` routes.
- Traced frontend: `api-client.ts` → `AuthContext` → all `app/**` pages + `Nav`.
- Traced MCP: `api.ts`, `session.ts`, `server.ts`, `http.ts`, `index.ts`, tests, READMEs, `.mcp.json`.
- Ran `pg_isready` (accepting connections) and `redis-cli ping` (PONG) during the earlier session; **did not**
  re-run migrations/typecheck/test suites as part of writing docs — run `pnpm db:migrate` + `pnpm typecheck` +
  `pnpm --filter mcp test` before your first change to establish a local baseline.

---

## 7. Test & quality status (honest)

| Area | Status |
|------|--------|
| Backend unit/integration tests | **None** — no `test` script; coverage relies on Zod validation, typed errors, and typecheck |
| Frontend component/e2e tests | **None** — manual flows only (register → post → explore → profile) |
| MCP tests | **Present** — `vitest`: API error mapping, session lifecycle incl. 401-refresh-once, tool wiring incl. 403 passthrough |
| Typecheck | Per-package `tsc --noEmit` (backend, frontend, mcp incl. tests) — required pre-PR |
| Lint | No configured linter; style enforced by AGENTS.md review rules |

Minimum bar before claiming "done" on any new feature (per AGENTS.md): typecheck all touched sides +
add/extend tests for the feature's core logic.

---

## 8. Risks, limits, and what I'd change next

1. **No audit trail / admin story** — any moderation, abuse investigation, or compliance ask is unanswerable today. Proposal in §10.
2. **No Sentry** — despite the observability rule, production errors stop at logs. Wire `@sentry/nextjs` in both apps, attach `requestId`, keep pino redaction.
3. **No backend/frontend tests** — the highest-value first specs: auth rotation, post ownership (403 matrix), profile validation, cursor pagination edges.
4. **Avatar storage is single-instance** — move to S3/GCS + CDN when scaling horizontally (§3.13 seam is ready).
5. **Feed has no cache** — fine now (one indexed query), but add explicit-write-invalidation caching only after measuring.
6. **Secrets discipline** — dev placeholder JWT secrets ship in `.env`; rotate via `openssl rand -hex 64` and never commit real ones.
7. **`swr` unused** — either adopt it for feed dedup/revalidation or drop the dependency.
8. **MCP HTTP exposure** — localhost + 4 MB cap by default; any remote deployment needs TLS + access control in front.

---

## 9. Reproducible first-day checklist (for the onboard)

1. `pg_isready` + `redis-cli ping` → both answer.
2. `pnpm install` → `createdb final_project` (if needed) → `pnpm db:migrate`.
3. `pnpm dev` → frontend :3000, backend :4000, docs at `/api/docs`, health at `/health` → `healthy`.
4. Register → create post → see it in Explore → edit profile → logout → login.
5. `pnpm typecheck` clean; `pnpm --filter mcp test` green; MCP Inspector against `mcp/dist/index.js` lists 13 tools.
6. Make a one-line change on a `feat/` branch off `develop`; open a PR with typecheck evidence.

---

## 10. Explicitly out of scope: Audit Log + Admin Panel (proposed design)

The requested Audit Log (persistent Postgres log of registration, login/logout, profile updates, post
create/update/delete with user, action, target/resource, target ID, timestamp, metadata — never
passwords/tokens) and Admin Panel (admin role, Next.js UI over real API data, pagination + filters, backend +
frontend enforcement, Swagger + validation) are **not implemented**. If you pick this up, the
architecture-conformant sketch is: new `audit_logs` table + `modules/audit/` (service/repository/schemas/openapi,
fire-and-forget-from-request-path with its own bounded retry so logging never breaks the primary write);
`role` column on `users` (`user|admin`, default `user`, backfilled); `GET /api/admin/audit-logs` (admin-only via
`requireAuth` + role check, cursor-paginated, filters on action/actor/date, indexed columns) registered in the
Swagger registry; frontend `/admin` route gated on `user.role` *and* server 403s; seed one admin via migration;
verify normal-user-post → row → admin-visible → non-admin-403, then migrations + typecheck + new tests.
