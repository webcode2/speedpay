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
- Investor: `/login`, `/register`, `/dashboard`, `/profile`, `/verification`
- Staff: `/admin/login`, `/admin/kyc`, `/admin/payouts`, `/admin/projects`
- Investors are **mobile-first** (Flutter); payout accounts have no investor web UI

### Flutter mobile

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Use `http://localhost:3000` for iOS simulator. Auth uses Bearer tokens stored in secure storage. Profile, verification, and payout accounts are available in the app; KYC document upload remains on web for Chunk 04.

### Seeded admin (local dev only)

| Field | Default |
|---|---|
| Email | `admin@solar.local` |
| Password | `ChangeMeNow!123` |
| Name | `Super Admin` |

Investor accounts are created via `/register` (not seeded). Google OAuth is deferred.

### Object storage

- Dev: `STORAGE_DRIVER=local` writes under `LOCAL_UPLOAD_DIR` (default `uploads/`, gitignored)
- Prod: `STORAGE_DRIVER=r2` with `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

## Workspace layout

- `apps/web` — Next.js (API host + admin KYC/payouts; legacy investor web pages from earlier chunks)
- `apps/mobile` — Flutter investor client
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

Staff sessions use separate cookies/tokens via `/api/admin/auth/*`.

## Profile & KYC API

| Method | Path | Notes |
|---|---|---|
| GET/PATCH | `/api/profile` | Investor profile |
| GET/POST | `/api/verification` | Status / submit for review |
| POST | `/api/verification/documents` | Multipart document upload |
| GET | `/api/admin/kyc` | Staff queue |
| GET | `/api/admin/kyc/[id]` | Case detail |
| POST | `/api/admin/kyc/[id]/approve` | Approve |
| POST | `/api/admin/kyc/[id]/reject` | Reject |
| POST | `/api/admin/kyc/[id]/request-info` | Request more info |

## Payout accounts API

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/payout-accounts` | List / create (KYC_APPROVED required) |
| PATCH/DELETE | `/api/payout-accounts/[id]` | Edit / soft-delete |
| POST | `/api/payout-accounts/[id]/default` | Set default |
| GET | `/api/admin/payouts` | Staff queue (`status` query) |
| GET | `/api/admin/payouts/[id]` | Detail (full account number) |
| POST | `/api/admin/payouts/[id]/approve` | Approve |
| POST | `/api/admin/payouts/[id]/reject` | Reject with `{ reason }` |

## Admin projects API

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/admin/projects` | List / create draft |
| GET/PATCH | `/api/admin/projects/[id]` | Detail / edit |
| POST | `/api/admin/projects/[id]/publish\|pause\|resume\|complete\|archive` | Lifecycle |
| POST | `/api/admin/projects/[id]/documents` | Multipart upload (`kind`, `file`) |
| GET | `/api/admin/projects/[id]/documents/[docId]` | Stream file |

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
- Opaque Bearer sessions stored hashed in `user_sessions` / `admin_sessions`
- Investors (`users`) and staff (`admins`) are separate identity tables
- KYC documents via `ObjectStorage` (local or R2)
- Payout accounts require KYC approval and staff review before `VERIFIED`
- Financial calculations will be implemented server-side later
- API envelope: `{ success, data }` / `{ success: false, error }`

## Docs

- [Chunk 01 design](docs/superpowers/specs/2026-09-20-chunk-01-repository-foundation-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-01-repository-foundation.md)
- [Chunk 02 design](docs/superpowers/specs/2026-09-20-chunk-02-database-foundation-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-02-database-foundation.md)
- [Chunk 03 design](docs/superpowers/specs/2026-09-20-chunk-03-authentication-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-03-authentication.md)
- [Chunk 04 design](docs/superpowers/specs/2026-09-20-chunk-04-profile-verification-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-04-profile-verification.md)
- [Chunk 05 design](docs/superpowers/specs/2026-09-20-chunk-05-payout-accounts-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-05-payout-accounts.md)
- [Chunk 06 design](docs/superpowers/specs/2026-09-20-chunk-06-projects-design.md) / [plan](docs/superpowers/plans/2026-09-20-chunk-06-projects.md)
