# Chunk 02 — Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add identity, RBAC, and audit schema to PostgreSQL via Drizzle, with an idempotent seed that creates permissions, roles, and a SUPER_ADMIN account.

**Architecture:** Extend `@solar/database` with modular schema files and relations. Seed runs via `tsx` using postgres.js + Drizzle + argon2. No auth UI/API in this chunk.

**Tech Stack:** Drizzle ORM, PostgreSQL UUID (`gen_random_uuid()`), argon2, Vitest (in `database` package), dotenv

**Spec:** [docs/superpowers/specs/2026-09-20-chunk-02-database-foundation-design.md](../specs/2026-09-20-chunk-02-database-foundation-design.md)

## Global Constraints

- Separate `users` (investors) and `admins` (staff)
- UUID PKs with `gen_random_uuid()`
- argon2id password hashes only; never log plaintext passwords
- Seed defaults: `SEED_ADMIN_EMAIL=admin@solar.local`, `SEED_ADMIN_PASSWORD=ChangeMeNow!123`, `SEED_ADMIN_NAME=Super Admin`
- Seed must be idempotent
- No auth routes/UI, no Flutter, no financial domain tables
- No cron/workers
- Omit `admin_sessions` until Chunk 03
- Commit only when the execution workflow requires it (SDD) or the user asks

---

## File Structure (target)

```text
database/schema/enums.ts
database/schema/users.ts
database/schema/user-profiles.ts
database/schema/user-sessions.ts
database/schema/admins.ts
database/schema/roles.ts
database/schema/permissions.ts
database/schema/admin-roles.ts
database/schema/role-permissions.ts
database/schema/audit-logs.ts
database/schema/relations.ts
database/schema/index.ts                    # modify
database/schema/system-settings.ts          # unchanged
database/seed/catalog.ts                    # permission + role codes + role→permission map
database/seed/hash.ts                       # argon2 helpers
database/seed/permissions.ts
database/seed/roles.ts
database/seed/admin.ts
database/seed/settings.ts
database/seed/index.ts                      # replace no-op
database/seed/catalog.test.ts
database/seed/hash.test.ts
database/vitest.config.ts
database/package.json                       # modify: argon2, vitest, test script
.env.example                                # modify
README.md                                   # modify: seed section
```

---

### Task 1: Enums/constants + user identity tables

**Files:**
- Create: `database/schema/enums.ts`
- Create: `database/schema/users.ts`
- Create: `database/schema/user-profiles.ts`
- Create: `database/schema/user-sessions.ts`

**Interfaces:**
- Produces: `USER_STATUSES`, `users`, `userProfiles`, `userSessions` table exports

- [ ] **Step 1: Create `database/schema/enums.ts`**

```ts
export const USER_STATUSES = [
  "REGISTERED",
  "EMAIL_UNVERIFIED",
  "PHONE_UNVERIFIED",
  "KYC_PENDING",
  "KYC_APPROVED",
  "KYC_REJECTED",
  "INVESTMENT_RESTRICTED",
  "WITHDRAWAL_RESTRICTED",
  "SUSPENDED",
  "CLOSED",
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const ADMIN_STATUSES = ["ACTIVE", "DISABLED", "INVITED"] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const AUDIT_ACTOR_TYPES = ["ADMIN", "USER", "SYSTEM"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];
```

- [ ] **Step 2: Create `database/schema/users.ts`**

```ts
import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    status: text("status").notNull().default("EMAIL_UNVERIFIED"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    uniqueIndex("users_phone_unique").on(t.phone),
  ],
);
```

Note: unique on nullable `phone` in Postgres allows multiple NULLs — acceptable. If drizzle uniqueIndex on nullable causes issues, use `.unique()` on column instead and document.

- [ ] **Step 3: Create `database/schema/user-profiles.ts`**

```ts
import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Create `database/schema/user-sessions.ts`**

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("user_sessions_user_id_idx").on(t.userId),
    index("user_sessions_expires_at_idx").on(t.expiresAt),
  ],
);
```

---

### Task 2: Admin, RBAC, and audit tables

**Files:**
- Create: `database/schema/admins.ts`
- Create: `database/schema/roles.ts`
- Create: `database/schema/permissions.ts`
- Create: `database/schema/admin-roles.ts`
- Create: `database/schema/role-permissions.ts`
- Create: `database/schema/audit-logs.ts`

**Interfaces:**
- Produces: `admins`, `roles`, `permissions`, `adminRoles`, `rolePermissions`, `auditLogs`

- [ ] **Step 1: Create `database/schema/admins.ts`**

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Create `database/schema/roles.ts`**

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Create `database/schema/permissions.ts`**

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Create `database/schema/admin-roles.ts`**

```ts
import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { admins } from "./admins";
import { roles } from "./roles";

export const adminRoles = pgTable(
  "admin_roles",
  {
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.adminId, t.roleId] })],
);
```

- [ ] **Step 5: Create `database/schema/role-permissions.ts`**

```ts
import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { permissions } from "./permissions";
import { roles } from "./roles";

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);
```

- [ ] **Step 6: Create `database/schema/audit-logs.ts`**

```ts
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    reason: text("reason"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_actor_id_idx").on(t.actorId),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ],
);
```

---

### Task 3: Relations, schema index, migration

**Files:**
- Create: `database/schema/relations.ts`
- Modify: `database/schema/index.ts`
- Generate: `database/migrations/*`

**Interfaces:**
- Produces: Drizzle relations; `@solar/database` exports all tables + relations; new SQL migration

- [ ] **Step 1: Create `database/schema/relations.ts`**

```ts
import { relations } from "drizzle-orm";
import { adminRoles } from "./admin-roles";
import { admins } from "./admins";
import { permissions } from "./permissions";
import { rolePermissions } from "./role-permissions";
import { roles } from "./roles";
import { userProfiles } from "./user-profiles";
import { userSessions } from "./user-sessions";
import { users } from "./users";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(userSessions),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const adminsRelations = relations(admins, ({ many }) => ({
  adminRoles: many(adminRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  adminRoles: many(adminRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const adminRolesRelations = relations(adminRoles, ({ one }) => ({
  admin: one(admins, {
    fields: [adminRoles.adminId],
    references: [admins.id],
  }),
  role: one(roles, {
    fields: [adminRoles.roleId],
    references: [roles.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));
```

- [ ] **Step 2: Replace `database/schema/index.ts`**

```ts
export { systemSettings } from "./system-settings";
export * from "./enums";
export { users } from "./users";
export { userProfiles } from "./user-profiles";
export { userSessions } from "./user-sessions";
export { admins } from "./admins";
export { roles } from "./roles";
export { permissions } from "./permissions";
export { adminRoles } from "./admin-roles";
export { rolePermissions } from "./role-permissions";
export { auditLogs } from "./audit-logs";
export * from "./relations";
```

- [ ] **Step 3: Generate migration**

```bash
pnpm db:generate
pnpm --filter @solar/database build
```

Expected: new migration SQL creating all tables/indexes; `tsc --noEmit` passes.

- [ ] **Step 4: Apply migration if Postgres available**

```bash
pnpm db:migrate
```

If Docker/Postgres unavailable, commit migration files and document deferred apply (same as Chunk 01).

---

### Task 4: Seed catalog + argon2 hash helpers (TDD)

**Files:**
- Create: `database/vitest.config.ts`
- Create: `database/seed/catalog.ts`
- Create: `database/seed/hash.ts`
- Create: `database/seed/catalog.test.ts`
- Create: `database/seed/hash.test.ts`
- Modify: `database/package.json` (add `argon2`, `vitest`, `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `PERMISSION_CATALOG: { code: string; name: string }[]`
  - `ROLE_CATALOG: { code: string; name: string; description?: string }[]`
  - `ROLE_PERMISSION_CODES: Record<string, string[]>` (role code → permission codes; `SUPER_ADMIN`/`ADMIN` = all)
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(hash: string, plain: string): Promise<boolean>`

- [ ] **Step 1: Update `database/package.json` dependencies**

Add:

```json
"dependencies": {
  "argon2": "^0.41.1",
  "drizzle-orm": "^0.38.3",
  "postgres": "^3.4.5"
},
"devDependencies": {
  "...existing": "...",
  "vitest": "^2.1.8"
},
"scripts": {
  "...existing": "...",
  "test": "vitest run"
}
```

Run `pnpm install`.

- [ ] **Step 2: Write failing `database/seed/catalog.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  PERMISSION_CATALOG,
  ROLE_CATALOG,
  ROLE_PERMISSION_CODES,
  ALL_PERMISSION_CODES,
} from "./catalog";

describe("seed catalog", () => {
  it("includes all required permission codes", () => {
    const codes = PERMISSION_CATALOG.map((p) => p.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "users.read",
        "users.update",
        "users.disable",
        "kyc.read",
        "kyc.approve",
        "kyc.reject",
        "projects.create",
        "projects.update",
        "projects.publish",
        "packages.create",
        "packages.update",
        "packages.activate",
        "packages.pause",
        "investments.read",
        "investments.update",
        "withdrawals.read",
        "withdrawals.approve",
        "withdrawals.reject",
        "withdrawals.process",
        "returns.read",
        "returns.calculate",
        "maturities.read",
        "maturities.process",
        "staff.create",
        "staff.update",
        "roles.read",
        "roles.update",
        "audit.read",
      ]),
    );
    expect(codes).toHaveLength(28);
  });

  it("includes seven roles", () => {
    expect(ROLE_CATALOG.map((r) => r.code)).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
      "CUSTOMER_SUPPORT",
      "ACCOUNTANT",
      "FINANCE_OFFICER",
      "INVESTMENT_MANAGER",
      "KYC_OFFICER",
    ]);
  });

  it("gives SUPER_ADMIN and ADMIN every permission", () => {
    expect(ROLE_PERMISSION_CODES.SUPER_ADMIN).toEqual(ALL_PERMISSION_CODES);
    expect(ROLE_PERMISSION_CODES.ADMIN).toEqual(ALL_PERMISSION_CODES);
  });

  it("maps KYC_OFFICER to kyc permissions only", () => {
    expect(ROLE_PERMISSION_CODES.KYC_OFFICER).toEqual([
      "kyc.read",
      "kyc.approve",
      "kyc.reject",
    ]);
  });
});
```

- [ ] **Step 3: Run catalog tests — expect FAIL**

```bash
pnpm --filter @solar/database test -- seed/catalog.test.ts
```

- [ ] **Step 4: Implement `database/seed/catalog.ts`** with exact codes from the spec (28 permissions, 7 roles, role maps as designed). Export `ALL_PERMISSION_CODES` as `PERMISSION_CATALOG.map(p => p.code)`.

- [ ] **Step 5: Re-run catalog tests — expect PASS**

- [ ] **Step 6: Write failing `database/seed/hash.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./hash";

describe("password hash", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("ChangeMeNow!123");
    expect(hash).not.toContain("ChangeMeNow!123");
    await expect(verifyPassword(hash, "ChangeMeNow!123")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong")).resolves.toBe(false);
  });
});
```

- [ ] **Step 7: Run hash test — expect FAIL, then implement `database/seed/hash.ts`**

```ts
import argon2 from "argon2";

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  return argon2.verify(hash, plain);
}
```

- [ ] **Step 8: Full database test suite PASS**

```bash
pnpm --filter @solar/database test
```

- [ ] **Step 9: Create `database/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

---

### Task 5: Idempotent seed orchestrator

**Files:**
- Create: `database/seed/permissions.ts`
- Create: `database/seed/roles.ts`
- Create: `database/seed/admin.ts`
- Create: `database/seed/settings.ts`
- Replace: `database/seed/index.ts`

**Interfaces:**
- Consumes: catalog, hash helpers, schema tables, `DATABASE_URL`
- Produces: working `pnpm db:seed` that upserts all seed data and prints confirmation (email + role codes), without logging the password

- [ ] **Step 1: Implement upsert helpers** using Drizzle `onConflictDoUpdate` on unique `code` / `email` / `key`.

`permissions.ts`: insert all from catalog; on conflict update `name`.

`roles.ts`: insert roles; for each role, ensure `role_permissions` rows exist for mapped codes (insert missing only).

`admin.ts`: upsert admin by email; always refresh `password_hash` from current `SEED_ADMIN_PASSWORD` on seed (dev-friendly); ensure `admin_roles` links SUPER_ADMIN; insert audit log `SEED_COMPLETED` / `ADMIN_CREATED` only when admin was newly created (check existing by email first) — on re-seed, skip duplicate audit or insert `SEED_RERUN` once per run is fine; prefer: always insert one `SEED_COMPLETED` audit row per seed run with `actor_type=SYSTEM` (auditable re-runs).

`settings.ts`: upsert `app.name`, `app.currency`, `security.password_min_length`.

- [ ] **Step 2: Replace `database/seed/index.ts`**

```ts
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { seedPermissions } from "./permissions";
import { seedRoles } from "./roles";
import { seedAdmin } from "./admin";
import { seedSettings } from "./settings";

loadEnv({ path: path.resolve(process.cwd(), "../.env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    await seedPermissions(db);
    await seedRoles(db);
    const admin = await seedAdmin(db);
    await seedSettings(db);
    console.info("[seed] complete", {
      adminEmail: admin.email,
      adminStatus: admin.status,
    });
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[seed] failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
```

- [ ] **Step 3: Run seed when Postgres is up**

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:seed   # second run must succeed (idempotent)
```

If Postgres unavailable, leave seed code complete and document deferred verification.

---

### Task 6: Env example, README, DoD verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Append to `.env.example`**

```env
SEED_ADMIN_EMAIL=admin@solar.local
SEED_ADMIN_PASSWORD=ChangeMeNow!123
SEED_ADMIN_NAME=Super Admin
```

- [ ] **Step 2: Update README** with Chunk 02 section:

- `pnpm db:migrate`
- `pnpm db:seed`
- Default admin credentials (dev only)
- Note: change password before any shared/staging use
- Link to Chunk 02 design/plan docs

- [ ] **Step 3: Verification checklist**

```bash
pnpm --filter @solar/database test
pnpm --filter @solar/database build
pnpm db:generate   # no unexpected drift
pnpm --filter @solar/web test
pnpm --filter @solar/web build
```

Confirm no auth routes added under `apps/web/app`.

- [ ] **Step 4: Stop** — do not start Chunk 03 unless requested.

---

## Plan Self-Review

**Spec coverage:** Tables §3.1–3.10 → Tasks 1–2; relations → Task 3; seed catalog/roles/admin/settings → Tasks 4–5; argon2 → Task 4; env/README → Task 6; tests → Task 4; no auth UI → Global Constraints.

**Placeholder scan:** none; phone unique-null behavior noted.

**Type consistency:** table export names (`users`, `userProfiles`, …) match seed imports; catalog exports used by tests and seed modules.
