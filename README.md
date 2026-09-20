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
pnpm db:seed
pnpm --filter @solar/web dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Seeded admin (local dev only)

| Field | Default |
|---|---|
| Email | `admin@solar.local` |
| Password | `ChangeMeNow!123` |
| Name | `Super Admin` |

Override with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_ADMIN_NAME` in `.env`. Change these before any shared or staging use. Seed is idempotent (`pnpm db:seed` is safe to re-run).

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
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply Drizzle migrations to Postgres |
| `pnpm db:seed` | Seed permissions, roles, SUPER_ADMIN, and settings |
| `pnpm db:studio` | Open Drizzle Studio |

## Architecture notes

- No cron jobs or background workers
- Financial calculations will be implemented server-side later
- Investors (`users`) and staff (`admins`) are separate identity tables
- API responses use a consistent envelope:
  - Success: `{ success: true, data: T }`
  - Failure: `{ success: false, error: { code: ApiErrorCode, message: string } }`

## Docs

- Chunk 01 design: [docs/superpowers/specs/2026-09-20-chunk-01-repository-foundation-design.md](docs/superpowers/specs/2026-09-20-chunk-01-repository-foundation-design.md)
- Chunk 01 plan: [docs/superpowers/plans/2026-09-20-chunk-01-repository-foundation.md](docs/superpowers/plans/2026-09-20-chunk-01-repository-foundation.md)
- Chunk 02 design: [docs/superpowers/specs/2026-09-20-chunk-02-database-foundation-design.md](docs/superpowers/specs/2026-09-20-chunk-02-database-foundation-design.md)
- Chunk 02 plan: [docs/superpowers/plans/2026-09-20-chunk-02-database-foundation.md](docs/superpowers/plans/2026-09-20-chunk-02-database-foundation.md)
