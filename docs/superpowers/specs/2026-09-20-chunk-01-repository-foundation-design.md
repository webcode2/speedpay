# Chunk 01 — Repository Foundation Design

**Date:** 2026-09-20  
**Status:** Approved for implementation planning (pending user review of this doc)  
**Product:** Solar Investment Platform  
**Scope:** Foundation only — no auth, no financial features, no Flutter app

---

## 1. Goal

Deliver a running Next.js application in a pnpm/Turborepo monorepo, connected to PostgreSQL via Docker Compose and Drizzle ORM, with shared packages, environment configuration, API response conventions, structured logging, and a health endpoint that proves DB connectivity.

This is the first vertical slice of the 28-chunk roadmap. Later chunks build on this foundation without restructuring it.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Repo layout | Web-first monorepo; Flutter added later (same repo) |
| Local Postgres | Docker Compose in-repo |
| Tooling | pnpm workspaces + Turborepo |
| Web framework | Next.js App Router + TypeScript + Tailwind |
| ORM | Drizzle ORM |
| Background jobs | None (platform-wide constraint) |

---

## 3. Repository Structure

```text
solar-investment/                 # workspace root (current folder)
├── apps/
│   └── web/                      # Next.js investor + admin + API host
├── packages/
│   ├── types/                    # shared TypeScript types (API envelopes, error codes)
│   └── config/                   # shared tsconfig / eslint baselines
├── database/
│   ├── schema/                   # Drizzle schema modules
│   ├── migrations/               # generated SQL migrations
│   └── seed/                     # seed entrypoint (stub in Chunk 01)
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── docker-compose.yml
├── package.json                  # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
└── README.md
```

`apps/mobile/` is **not** created in Chunk 01. A short README note documents that Flutter lands in a later chunk.

---

## 4. Applications & Packages

### 4.1 `apps/web`

- Next.js App Router, TypeScript, Tailwind CSS
- Hosts future investor web, admin dashboard, and HTTPS API for Flutter
- Chunk 01 UI: minimal landing page + connection status from `/api/health`
- Server code lives under a clear tree, e.g.:

```text
apps/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       └── health/
│           └── route.ts
├── src/
│   ├── db/                 # Drizzle client wired to DATABASE_URL
│   ├── lib/
│   │   ├── api-response.ts # success/error helpers
│   │   └── logger.ts       # structured logger
│   └── env.ts              # validated env (Zod)
├── package.json
└── tsconfig.json
```

### 4.2 `packages/types`

- Shared API envelope types: `ApiSuccess<T>`, `ApiError`, `ApiErrorBody`
- Shared error code string union (start small: `INTERNAL_ERROR`, `DATABASE_UNAVAILABLE`, `VALIDATION_ERROR`)
- No domain/financial types yet

### 4.3 `packages/config`

- Base `tsconfig` presets consumed by `apps/web` and other packages
- ESLint stays app-local under `apps/web` for Chunk 01 (no shared ESLint package yet)

### 4.4 `database` (`@solar/database`)

- Single source of truth for Drizzle schema and migrations
- Chunk 01 schema: minimal `system_settings` table (`key` text PK, `value` text, `updated_at` timestamptz) so migrations are real and Chunk 02/24 can extend the same table
- `database/drizzle.config.ts` owns generate/migrate config
- `database/seed/` exports a no-op seed script that logs “no seed data in Chunk 01”

---

## 5. PostgreSQL & Docker

`docker-compose.yml` runs Postgres 16 with:

- Service name: `postgres`
- Port: `5432` published to host
- Named volume for data persistence
- Credentials: user `solar`, password `solar`, database `solar_investment` (match `.env.example`)

Developer flow:

```text
docker compose up -d
pnpm install
pnpm db:migrate
pnpm --filter web dev
```

Health check in Compose confirms Postgres is ready before app use.

---

## 6. Environment Configuration

Root `.env.example` (never commit real secrets):

```text
DATABASE_URL=postgresql://solar:solar@localhost:5432/solar_investment
NODE_ENV=development
LOG_LEVEL=info
```

- `apps/web` loads env via validated Zod schema (`src/env.ts`)
- Missing/invalid env fails fast at startup for server code paths that need DB
- `.gitignore` excludes `.env`, `.env.local`, and similar

---

## 7. Drizzle Integration

- Schema defined under `database/schema/`
- Drizzle config at `database/drizzle.config.ts` pointing at schema + `database/migrations/`
- Scripts from root `package.json` (via Turbo filters):

| Script | Purpose |
|---|---|
| `db:generate` | Generate migrations from schema |
| `db:migrate` | Apply migrations |
| `db:studio` | Drizzle Studio against local DB |
| `db:seed` | Run seed stub |

- `apps/web/src/db` exports a single `db` client using the `postgres` (postgres.js) driver with Drizzle
- No financial calculations; no repositories beyond what health needs

---

## 8. API Response Conventions

All JSON API handlers use one envelope:

**Success**

```json
{
  "success": true,
  "data": { }
}
```

**Error**

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Database is unavailable."
  }
}
```

Rules:

- Never return raw database / stack traces to clients
- Map unexpected errors to `INTERNAL_ERROR` with a safe message
- Helpers live in `apps/web/src/lib/api-response.ts` and use types from `@solar/types`
- Workspace package names: `@solar/types`, `@solar/config`, `@solar/database`, `@solar/web`

---

## 9. Logging

- Server-side structured logger (`apps/web/src/lib/logger.ts`)
- Levels: `debug`, `info`, `warn`, `error`
- Include request-scoped context where available (route, duration)
- Do not log passwords, tokens, or full connection strings
- Chunk 01: console JSON or simple structured lines is enough; no external log vendor

---

## 10. Health Endpoint

`GET /api/health`

Behavior:

1. Return app liveness always when the process is up
2. Attempt a trivial DB query: `select 1` via the Drizzle/`postgres` client
3. Response shape:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "up",
    "timestamp": "2026-09-20T00:00:00.000Z"
  }
}
```

If DB is down:

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Database is unavailable."
  }
}
```

HTTP status: `200` when app+DB ok; `503` when DB down.

Landing page is a Server Component that queries the DB (or calls the health helper) and shows “Connected” or “Database unavailable”.

---

## 11. Error Handling

- Central helpers for API routes
- Unhandled errors logged server-side, client gets `INTERNAL_ERROR`
- Validation (when present) uses Zod and maps to `VALIDATION_ERROR`
- Chunk 01 has no auth errors yet

---

## 12. Testing (Chunk 01)

Minimal but real (no Docker-dependent CI in Chunk 01):

- Unit test for API response helpers (success/error shape)
- Unit test for env schema accepting valid values and rejecting missing `DATABASE_URL`

Test runner: Vitest in `apps/web`. Manual verification of `/api/health` against Docker is part of Definition of Done.

---

## 13. Documentation

Root `README.md` covers:

- Prerequisites (Node, pnpm, Docker)
- `docker compose up -d`
- Install, migrate, dev
- Package layout overview
- Explicit note: no cron/workers; Flutter deferred
- Link to product chunk roadmap (pointer to this specs folder / parent product spec if added later)

---

## 14. Explicit Non-Goals (Chunk 01)

Do **not** implement:

- Authentication, sessions, users
- Admin UI, investor dashboard features
- Wallet, ledger, investments, packages, projects
- Flutter application
- Payment providers, email/SMS, object storage
- Cron, queues, background workers
- Domain seed data / admin user (Chunk 02)

---

## 15. Definition of Done

Chunk 01 is done when:

- [ ] Monorepo boots with `pnpm install` and `pnpm --filter web dev`
- [ ] `docker compose up -d` starts Postgres
- [ ] Drizzle migrations apply cleanly
- [ ] `GET /api/health` reports DB up when Compose is running
- [ ] API envelope helpers + logger exist and are used by health
- [ ] `.env.example` and README document the setup
- [ ] No TypeScript errors in the workspace for delivered packages
- [ ] Chunk 01 tests pass
- [ ] No financial or auth code introduced

---

## 16. Follow-on

**Chunk 02 — Database Foundation** adds `users`, profiles, sessions, admins, roles, permissions, audit_logs, and expands `system_settings`, plus an initial admin seed. Schema work in Chunk 01 must not invent user/financial fields early.
