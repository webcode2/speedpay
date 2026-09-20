# Solar Investment Platform

Next.js full-stack monorepo + PostgreSQL + Flutter investor auth client.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker Compose
- Flutter 3.x (for `apps/mobile`)

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
- Auth: `/login`, `/register`, `/forgot-password`, `/dashboard`

### Flutter mobile

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Use `http://localhost:3000` for iOS simulator. Auth uses Bearer tokens stored in secure storage.

### Seeded admin (local dev only)

| Field | Default |
|---|---|
| Email | `admin@solar.local` |
| Password | `ChangeMeNow!123` |
| Name | `Super Admin` |

Investor accounts are created via `/register` (not seeded). Google OAuth is deferred.

## Workspace layout

- `apps/web` — Next.js (investor web + API + admin host later)
- `apps/mobile` — Flutter investor auth client
- `packages/types` — shared API envelope types
- `packages/config` — shared TypeScript configs
- `database` — Drizzle schema, migrations, and seed

## Auth API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | Creates user + session |
| POST | `/api/auth/login` | Issues session |
| POST | `/api/auth/logout` | Revokes session |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/forgot-password` | Dev returns `resetToken` |
| POST | `/api/auth/reset-password` | Sets new password |

Send `Authorization: Bearer <token>` (web also uses httpOnly `session_token` cookie).

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
- Opaque Bearer sessions stored hashed in `user_sessions`
- Investors (`users`) and staff (`admins`) are separate identity tables
- Financial calculations will be implemented server-side later
- API envelope: `{ success, data }` / `{ success: false, error }`

## Docs

- [Chunk 01 design](docs/superpowers/specs/2026-09-20-chunk-01-repository-foundation-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-01-repository-foundation.md)
- [Chunk 02 design](docs/superpowers/specs/2026-09-20-chunk-02-database-foundation-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-02-database-foundation.md)
- [Chunk 03 design](docs/superpowers/specs/2026-09-20-chunk-03-authentication-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-03-authentication.md)
