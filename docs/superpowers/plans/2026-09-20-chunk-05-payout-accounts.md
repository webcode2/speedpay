# Chunk 05 — Payout Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KYC-gated investor payout accounts (Flutter + APIs) with staff admin review queue (web), soft-delete, default account, and RBAC + audit.

**Architecture:** New `payout_accounts` table; investor session APIs under `/api/payout-accounts`; admin session APIs under `/api/admin/payouts`; Flutter-only investor UI; admin web mirrors KYC queue pattern. No investor web pages. No bank lookup. No withdrawals/PIN.

**Tech Stack:** Next.js, Zod, Drizzle, Vitest, Flutter (existing app)

**Spec:** [docs/superpowers/specs/2026-09-20-chunk-05-payout-accounts-design.md](../specs/2026-09-20-chunk-05-payout-accounts-design.md)

## Global Constraints

- Investors are **Flutter-only** — do not create `/payout-accounts` investor web page
- Create requires `users.status === KYC_APPROVED` else `KYC_REQUIRED`
- Edit of `VERIFIED` account resets to `PENDING` and clears review fields
- Soft-delete via `deleted_at`; no auto-promote of default on remove
- Mask account number (last 4) on investor lists; full number on admin detail
- Server enforces `payouts.*` permissions; audit approve/reject/set-default/remove
- No bank name enquiry, withdrawals, or withdrawal PIN
- No cron/workers
- Branch: `chunk-05-payout-accounts` (already created from Chunk 04 HEAD)
- Migrate deferred if Postgres unavailable

---

## File map

| Path | Responsibility |
|---|---|
| `database/schema/enums.ts` | `PAYOUT_ACCOUNT_STATUSES` |
| `database/schema/payout-accounts.ts` | Drizzle table |
| `database/schema/index.ts`, `relations.ts` | Exports / relations |
| `database/migrations/0004_*.sql` | Generated migration |
| `database/seed/catalog.ts` (+ test) | `payouts.read/approve/reject` |
| `packages/types/src/api.ts` | `KYC_REQUIRED`, `INVALID_STATE` |
| `apps/web/src/services/payout-account-service.ts` | Investor CRUD + default |
| `apps/web/src/services/admin-payout-service.ts` | Queue + approve/reject |
| `apps/web/src/validators/payout.ts` | Zod create/update/reject |
| `apps/web/app/api/payout-accounts/**` | Investor routes |
| `apps/web/app/api/admin/payouts/**` | Admin routes |
| `apps/web/app/admin/payouts/**` | Admin UI |
| `apps/mobile/lib/features/auth/payout_accounts_screen.dart` | Flutter UI |
| `README.md` | Notes |

---

## Tasks Overview

1. Schema + migration + seed permissions + error codes  
2. Investor payout service + unit tests + API routes  
3. Admin payout service + API routes  
4. Admin web UI  
5. Flutter payout screens + routes  
6. Docs + DoD  

---

### Task 1: Schema, seed, error codes

**Files:**
- Create: `database/schema/payout-accounts.ts`
- Modify: `database/schema/enums.ts`, `index.ts`, `relations.ts`
- Modify: `database/seed/catalog.ts`, `catalog.test.ts`
- Modify: `packages/types/src/api.ts`
- Generate: `database/migrations/0004_*.sql` via `pnpm db:generate`

**Enums** — add to `enums.ts`:

```ts
export const PAYOUT_ACCOUNT_STATUSES = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;
export type PayoutAccountStatus = (typeof PAYOUT_ACCOUNT_STATUSES)[number];
```

**Table** — mirror `verification-requests` style (`text` status, timestamps with timezone):

```ts
// database/schema/payout-accounts.ts
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { admins } from "./admins";
import { users } from "./users";

export const payoutAccounts = pgTable(
  "payout_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bankName: text("bank_name").notNull(),
    accountNumber: text("account_number").notNull(),
    accountName: text("account_name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    status: text("status").notNull().default("PENDING"),
    rejectionReason: text("rejection_reason"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => admins.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("payout_accounts_user_id_idx").on(t.userId),
    index("payout_accounts_status_idx").on(t.status),
  ],
);
```

**Seed** — append to `PERMISSION_CATALOG`:

```ts
{ code: "payouts.read", name: "Read payout accounts" },
{ code: "payouts.approve", name: "Approve payout accounts" },
{ code: "payouts.reject", name: "Reject payout accounts" },
```

`SUPER_ADMIN` / `ADMIN` already get `ALL_PERMISSION_CODES`. Optionally add the three codes to `FINANCE_OFFICER` for ops realism.

**Error codes** — extend `ApiErrorCode`:

```ts
| "KYC_REQUIRED"
| "INVALID_STATE"
```

- [ ] **Step 1:** Add enum + schema + exports + relations (`users` ↔ `payoutAccounts`, `admins` ↔ reviewed)
- [ ] **Step 2:** Update seed catalog + adjust `catalog.test.ts` expectations
- [ ] **Step 3:** Extend `ApiErrorCode`
- [ ] **Step 4:** `pnpm db:generate` and `pnpm --filter @solar/database build` (+ catalog tests)
- [ ] **Step 5:** Commit `feat(database): add payout_accounts schema and permissions`

---

### Task 2: Investor payout service + APIs

**Files:**
- Create: `apps/web/src/validators/payout.ts`
- Create: `apps/web/src/services/payout-account-service.ts`
- Create: `apps/web/src/services/payout-account-service.test.ts` (pure helpers + mocked db if pattern exists; otherwise test `maskAccountNumber` + status transition helpers extracted)
- Create: `apps/web/app/api/payout-accounts/route.ts` — GET list, POST create
- Create: `apps/web/app/api/payout-accounts/[id]/route.ts` — PATCH, DELETE
- Create: `apps/web/app/api/payout-accounts/[id]/default/route.ts` — POST

**Validators:**

```ts
import { z } from "zod";

export const payoutAccountBodySchema = z.object({
  bankName: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(4).max(34),
  accountName: z.string().trim().min(1).max(120),
});
```

**Service surface:**

```ts
maskAccountNumber(num: string): string  // ****1234 style, last 4 visible
listPayoutAccounts(userId: string)
createPayoutAccount(userId: string, input: {...})
updatePayoutAccount(userId: string, id: string, input: {...})
setDefaultPayoutAccount(userId: string, id: string, meta?: { ip?, userAgent? })
deletePayoutAccount(userId: string, id: string, meta?: ...)
```

**Behavior (must match spec):**

1. `create`: load user; if status ≠ `KYC_APPROVED` throw `AppError` `KYC_REQUIRED`; insert `PENDING`; if no other non-deleted rows, `isDefault=true`
2. `list`: `deletedAt` is null; return masked `accountNumber`
3. `update`: ownership; if status was `VERIFIED`, set `PENDING`, null out review fields
4. `setDefault`: transaction — clear other defaults, set this one; insert `audit_logs` actor USER
5. `delete`: set `deletedAt=now()`, `isDefault=false`; audit USER; do not auto-promote

Routes: reuse investor auth from `requireUser` / existing profile routes pattern (`getBearerOrCookieToken` + session).

- [ ] **Step 1:** Write failing unit tests for mask + KYC gate / verified-edit reset (extract pure functions if DB hard to mock)
- [ ] **Step 2:** Implement service + validators + routes
- [ ] **Step 3:** `pnpm --filter @solar/web test` passes
- [ ] **Step 4:** Commit `feat(web): add investor payout account APIs`

---

### Task 3: Admin payout service + APIs

**Files:**
- Create: `apps/web/src/services/admin-payout-service.ts`
- Create: `apps/web/app/api/admin/payouts/route.ts`
- Create: `apps/web/app/api/admin/payouts/[id]/route.ts`
- Create: `apps/web/app/api/admin/payouts/[id]/approve/route.ts`
- Create: `apps/web/app/api/admin/payouts/[id]/reject/route.ts`

**Mirror** `admin-kyc-service.ts` patterns: `requireAdmin` + `adminHasPermission`, `auditLogs` inserts.

```ts
listPayoutQueue({ status?: string }) // default PENDING, exclude deleted
getPayoutDetail(id) // full accountNumber + user { id, email, status }
approvePayout(adminId, id)
rejectPayout(adminId, id, reason: string) // reason min 1 char
```

Reject body Zod: `{ reason: z.string().trim().min(1).max(500) }`.

Transitions only from `PENDING`; else `INVALID_STATE`.

- [ ] **Step 1:** Implement service + routes
- [ ] **Step 2:** Smoke via typecheck/build (Postgres may be down)
- [ ] **Step 3:** Commit `feat(admin): add payout account review APIs`

---

### Task 4: Admin web UI

**Files:**
- Create: `apps/web/app/admin/payouts/page.tsx` — queue (copy KYC queue UX)
- Create: `apps/web/app/admin/payouts/[id]/page.tsx` — detail + Approve / Reject form
- Modify: `apps/web/app/admin/kyc/page.tsx` (and/or login) — add link to Payouts queue

No investor web page.

- [ ] **Step 1:** Build queue + detail pages
- [ ] **Step 2:** `pnpm --filter @solar/web build`
- [ ] **Step 3:** Commit `feat(admin): add payout accounts review UI`

---

### Task 5: Flutter investor UI

**Files:**
- Create: `apps/mobile/lib/features/auth/payout_accounts_screen.dart` (list + inline add/edit or second screen)
- Modify: `apps/mobile/lib/core/api/api_client.dart` — ensure `delete` method if missing (add `_send` DELETE)
- Modify: `apps/mobile/lib/main.dart` — route `/payout-accounts`
- Modify: `apps/mobile/lib/features/auth/home_screen.dart` and/or `profile_screen.dart` — navigation entry

**API client:** add `delete(path, {auth})` alongside existing get/post/patch.

**Screen behavior:**

- Load GET `/api/payout-accounts`
- Add via dialog/form POST
- Edit PATCH
- Set default POST `.../default`
- Remove DELETE
- Show status + rejectionReason when rejected
- Handle `KYC_REQUIRED` with clear message

- [ ] **Step 1:** ApiClient DELETE + screens + routes
- [ ] **Step 2:** `cd apps/mobile && flutter analyze --no-fatal-infos`
- [ ] **Step 3:** Commit `feat(mobile): add payout accounts screens`

---

### Task 6: Docs + DoD

**Files:**
- Modify: `README.md` — payout APIs, admin `/admin/payouts`, Flutter-only investor note, seed admin still `admin@solar.local`

- [ ] **Step 1:** README update
- [ ] **Step 2:** Run verification:

```bash
pnpm --filter @solar/database build
pnpm --filter @solar/web test
pnpm --filter @solar/web build
cd apps/mobile && flutter analyze --no-fatal-infos
```

- [ ] **Step 3:** Commit `docs: document Chunk 05 payout accounts`
- [ ] **Step 4:** Present finishing-branch options

---

## Plan Self-Review

| Spec item | Task |
|---|---|
| `payout_accounts` + statuses | T1 |
| Seed `payouts.*` | T1 |
| KYC gate, default, edit reset, soft-delete, mask | T2 |
| Investor APIs | T2 |
| Admin queue/approve/reject + RBAC + audit | T3 |
| Admin web UI | T4 |
| Flutter UI | T5 |
| No investor web / no bank API / no withdrawals | Global + T4/T6 |
| README + DoD | T6 |
| `KYC_REQUIRED` / `INVALID_STATE` | T1–T3 |

No placeholders. Types consistent (`PENDING`/`VERIFIED`/`REJECTED`).
