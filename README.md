# Solar Investment Platform

Next.js full-stack monorepo + PostgreSQL; Flutter deferred.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker Compose

## Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm --filter @solar/web dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Workspace layout

- `apps/web` — Next.js App Router web app (Tailwind, health API, landing)
- `packages/types` — shared API envelope types (`ApiResponse`, `ApiErrorCode`, …)
- `packages/config` — shared TypeScript / tooling config
- `database` — Drizzle schema, migrations, and seed (`@solar/database`)
- `apps/mobile` — not created yet (Flutter deferred)

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm --filter @solar/web dev` | Start the Next.js dev server on port 3000 |
| `pnpm --filter @solar/web test` | Run Vitest for `@solar/web` |
| `pnpm db:migrate` | Apply Drizzle migrations to Postgres |
| `pnpm db:seed` | Run seed stub (no-op in Chunk 01) |

## Architecture notes

- No cron jobs or background workers in Chunk 01.
- Financial calculations will be implemented server-side later (not in this chunk).
- API responses use a consistent envelope:
  - Success: `{ success: true, data: T }`
  - Failure: `{ success: false, error: { code: ApiErrorCode, message: string } }`

## Docs

- Design: [docs/superpowers/specs/2026-09-20-chunk-01-repository-foundation-design.md](docs/superpowers/specs/2026-09-20-chunk-01-repository-foundation-design.md)
- Plan: [docs/superpowers/plans/2026-09-20-chunk-01-repository-foundation.md](docs/superpowers/plans/2026-09-20-chunk-01-repository-foundation.md)
