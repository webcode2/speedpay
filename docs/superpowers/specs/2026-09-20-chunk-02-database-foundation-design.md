# Chunk 02 — Database Foundation Design

**Date:** 2026-09-20  
**Status:** Approved — ready for implementation  
**Product:** Solar Investment Platform  
**Depends on:** Chunk 01 (monorepo, Drizzle, `system_settings` stub, Docker Postgres)  
**Scope:** Schema, relations, migrations, and seed for identity + RBAC + audit. No auth UI/API (Chunk 03). No Flutter. No financial domain tables.

---

## 1. Goal

Deliver a migrated PostgreSQL schema covering users, profiles, sessions, staff admins, roles, permissions, audit logs, and system settings, plus an idempotent seed that creates the initial permission catalog, seven roles, and one `SUPER_ADMIN` account.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Identity model | Separate `users` (investors) and `admins` (staff) |
| IDs | UUID primary keys (`gen_random_uuid()`) |
| Password hashing | argon2id (seed + future auth); store hash only |
| Seed admin | Env-driven with defaults: `admin@solar.local` / `ChangeMeNow!123` |
| Seed behavior | Idempotent (safe to re-run) |
| Auth routes / login UI | Out of scope (Chunk 03) |
| Flutter | Out of scope |

---

## 3. Tables

### 3.1 `users`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `email` | text | unique, not null |
| `phone` | text | nullable, unique when present |
| `password_hash` | text | not null |
| `status` | text | not null; see statuses below |
| `email_verified_at` | timestamptz | nullable |
| `phone_verified_at` | timestamptz | nullable |
| `created_at` | timestamptz | not null, default now |
| `updated_at` | timestamptz | not null, default now |

Statuses (text; enforce in app/Zod later):

```text
REGISTERED
EMAIL_UNVERIFIED
PHONE_UNVERIFIED
KYC_PENDING
KYC_APPROVED
KYC_REJECTED
INVESTMENT_RESTRICTED
WITHDRAWAL_RESTRICTED
SUSPENDED
CLOSED
```

Default for newly inserted seed-less rows in later chunks: `EMAIL_UNVERIFIED`. Chunk 02 creates no investor users in seed.

### 3.2 `user_profiles`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK/FK → users.id | on delete cascade |
| `first_name` | text | nullable |
| `middle_name` | text | nullable |
| `last_name` | text | nullable |
| `date_of_birth` | date | nullable |
| `gender` | text | nullable |
| `address` | text | nullable |
| `city` | text | nullable |
| `state` | text | nullable |
| `country` | text | nullable |
| `profile_image` | text | nullable (URL/path) |
| `created_at` | timestamptz | not null |
| `updated_at` | timestamptz | not null |

### 3.3 `user_sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users.id | on delete cascade |
| `token_hash` | text | unique, not null (never store raw token) |
| `ip_address` | text | nullable |
| `user_agent` | text | nullable |
| `expires_at` | timestamptz | not null |
| `revoked_at` | timestamptz | nullable |
| `created_at` | timestamptz | not null |

Index: `(user_id)`, `(expires_at)`.

### 3.4 `admins`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | unique, not null |
| `password_hash` | text | not null |
| `name` | text | not null |
| `status` | text | `ACTIVE` \| `DISABLED` \| `INVITED` |
| `created_at` | timestamptz | not null |
| `updated_at` | timestamptz | not null |

Staff sessions are deferred to Chunk 03 if needed; Chunk 02 may omit `admin_sessions` unless required for seed completeness. **Decision: omit `admin_sessions` until Chunk 03** to avoid unused tables.

### 3.5 `roles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | text | unique, not null (e.g. `SUPER_ADMIN`) |
| `name` | text | not null |
| `description` | text | nullable |
| `created_at` | timestamptz | not null |
| `updated_at` | timestamptz | not null |

Initial role codes:

```text
SUPER_ADMIN
ADMIN
CUSTOMER_SUPPORT
ACCOUNTANT
FINANCE_OFFICER
INVESTMENT_MANAGER
KYC_OFFICER
```

### 3.6 `permissions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | text | unique, not null (e.g. `users.read`) |
| `name` | text | not null |
| `description` | text | nullable |
| `created_at` | timestamptz | not null |

Initial permission codes (product §36):

```text
users.read
users.update
users.disable
kyc.read
kyc.approve
kyc.reject
projects.create
projects.update
projects.publish
packages.create
packages.update
packages.activate
packages.pause
investments.read
investments.update
withdrawals.read
withdrawals.approve
withdrawals.reject
withdrawals.process
returns.read
returns.calculate
maturities.read
maturities.process
staff.create
staff.update
roles.read
roles.update
audit.read
```

### 3.7 `admin_roles`

| Column | Type | Notes |
|---|---|---|
| `admin_id` | uuid FK → admins.id | PK composite |
| `role_id` | uuid FK → roles.id | PK composite |
| `created_at` | timestamptz | not null |

### 3.8 `role_permissions`

| Column | Type | Notes |
|---|---|---|
| `role_id` | uuid FK → roles.id | PK composite |
| `permission_id` | uuid FK → permissions.id | PK composite |
| `created_at` | timestamptz | not null |

### 3.9 `audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `actor_id` | uuid | nullable (system actions) |
| `actor_type` | text | `ADMIN` \| `USER` \| `SYSTEM` |
| `action` | text | not null (e.g. `ADMIN_CREATED`) |
| `entity_type` | text | not null |
| `entity_id` | text | not null |
| `before` | jsonb | nullable |
| `after` | jsonb | nullable |
| `reason` | text | nullable |
| `ip_address` | text | nullable |
| `user_agent` | text | nullable |
| `created_at` | timestamptz | not null |

Index: `(actor_id)`, `(entity_type, entity_id)`, `(created_at)`.

### 3.10 `system_settings` (existing)

Keep Chunk 01 columns. Seed keys (string values):

| key | example value |
|---|---|
| `app.name` | `Solar Investment` |
| `app.currency` | `NGN` |
| `security.password_min_length` | `12` |

No UI for settings in Chunk 02.

---

## 4. Relations (Drizzle)

- `users` 1—1 `user_profiles`
- `users` 1—N `user_sessions`
- `admins` N—M `roles` via `admin_roles`
- `roles` N—M `permissions` via `role_permissions`

Export all tables + relations from `database/schema/index.ts`.

---

## 5. File layout

```text
database/
  schema/
    system-settings.ts      # existing
    users.ts
    user-profiles.ts
    user-sessions.ts
    admins.ts
    roles.ts
    permissions.ts
    admin-roles.ts
    role-permissions.ts
    audit-logs.ts
    enums.ts                # optional shared status/code constants as TS consts
    index.ts
  seed/
    index.ts                # orchestrator
    permissions.ts
    roles.ts
    admin.ts
    settings.ts
  migrations/               # generated
```

---

## 6. Seed behavior

1. Load env: `DATABASE_URL`, `SEED_ADMIN_EMAIL` (default `admin@solar.local`), `SEED_ADMIN_PASSWORD` (default `ChangeMeNow!123`), `SEED_ADMIN_NAME` (default `Super Admin`).
2. Upsert permissions by `code`.
3. Upsert roles by `code`.
4. For `SUPER_ADMIN`, attach **all** permissions (replace-set or insert-missing).
5. For other roles, attach subsets:
   - `SUPER_ADMIN`: all permissions
   - `ADMIN`: all permissions
   - `KYC_OFFICER`: `kyc.read`, `kyc.approve`, `kyc.reject`
   - `FINANCE_OFFICER`: `withdrawals.read`, `withdrawals.approve`, `withdrawals.reject`, `withdrawals.process`, `returns.read`, `returns.calculate`, `maturities.read`, `maturities.process`
   - `INVESTMENT_MANAGER`: `projects.create`, `projects.update`, `projects.publish`, `packages.create`, `packages.update`, `packages.activate`, `packages.pause`, `investments.read`, `investments.update`
   - `ACCOUNTANT`: `returns.read`, `withdrawals.read`, `investments.read`, `audit.read`
   - `CUSTOMER_SUPPORT`: `users.read`, `kyc.read`
6. Upsert admin by email; set argon2id hash from password; status `ACTIVE`.
7. Attach `SUPER_ADMIN` role to that admin.
8. Upsert `system_settings` keys.
9. Write one `audit_logs` row: `action=ADMIN_CREATED` (or `SEED_COMPLETED`), `actor_type=SYSTEM`.

Seed must be idempotent: re-running does not duplicate roles/permissions/admins.

Update `.env.example` with seed vars (not the production password expectation beyond the documented default).

---

## 7. Password hashing

- Library: `@node-rs/argon2` or `argon2` npm package (prefer `argon2`).
- Used in seed only in Chunk 02.
- Never log plaintext passwords.
- Never commit plaintext passwords except as documented defaults in `.env.example` / README for local dev.

---

## 8. App / API surface in Chunk 02

**In scope (minimal):**

- Schema + migration applied
- `pnpm db:seed` works
- Optional read-only smoke: a tiny script or seed stdout confirming admin email + role codes created

**Out of scope:**

- Login/register routes
- Session creation
- Admin dashboard
- Permission middleware (Chunk 21 / Chunk 03 start)
- Investor registration

---

## 9. Testing

- Unit test: permission/role seed catalog completeness (codes match the lists above)
- Unit test: password hash verify round-trip with argon2 (hash then verify)
- Manual: `pnpm db:migrate && pnpm db:seed` against Docker Postgres when available

---

## 10. Definition of Done

- [ ] All tables migrated
- [ ] Relations export cleanly from `@solar/database`
- [ ] Seed creates permissions, roles, SUPER_ADMIN admin, settings
- [ ] Seed is idempotent
- [ ] `.env.example` documents seed vars
- [ ] README notes Chunk 02 seed usage
- [ ] No auth UI/API; no financial tables; no Flutter
- [ ] Typecheck passes for `database` package
- [ ] Catalog/hash unit tests pass

---

## 11. Follow-on

**Chunk 03 — Authentication** adds register/login/logout, session issuance against `user_sessions`, password reset, Google auth, and the first Flutter + Next.js auth screens using this schema.
