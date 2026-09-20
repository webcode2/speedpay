# Admin Settings, Payment Accounts & Package Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-width admin pages, view-only settings with per-group edit cards, platform payment accounts (publish/disable + random pick on deposit), and two-column package forms with required banner image using SPEED PAY light form chrome.

**Architecture:** Keep settings in existing `system_settings` + catalog. Add first-class `platform_payment_accounts` with admin CRUD; deposit create selects a random `PUBLISHED` row and builds mock payment instructions. Packages gain `bannerImage` storage key; upload via `getStorage()` before/with create. Shared admin UI kit (`AdminCard` / `AdminInput`) replaces dark slate forms.

**Tech Stack:** Next.js App Router, Drizzle/Postgres, Vitest, existing admin RBAC + object storage (`local`|`r2`).

**Spec:** `docs/superpowers/specs/2026-09-20-admin-settings-payment-accounts-package-banner-design.md`

## Global Constraints

- Randomization: fresh uniform random among `PUBLISHED` accounts on every deposit create (not sticky).
- Account types: `BANK` | `MOBILE_MONEY` | `OTHER`.
- Status: `PUBLISHED` | `DISABLED`; create defaults to `DISABLED`.
- Settings: view-only by default; one catalog group per card; Edit/Save/Cancel per card only.
- Admin pages: remove page-level `max-w-*` (keep login card `max-w-md`).
- Forms: no dark `bg-slate-900` / `border-slate-600` in admin package/payment forms — use brand CSS variables.
- Package banner required for create/update validation.
- Permissions: `payment_accounts.read` / `payment_accounts.write`.

---

## File map

| Path | Responsibility |
|------|----------------|
| `database/schema/platform-payment-accounts.ts` | New table |
| `database/schema/investment-packages.ts` | Add `bannerImage` |
| `database/schema/index.ts` | Export new table |
| `database/seed/catalog.ts` (+ test) | New permissions |
| `apps/web/src/services/platform-payment-account-service.ts` | Admin CRUD + `pickRandomPublishedAccount` |
| `apps/web/src/services/platform-payment-account-service.test.ts` | Unit tests (selection + formatting) |
| `apps/web/src/services/deposit-service.ts` | Wire random account into payment instructions |
| `apps/web/app/api/admin/payment-accounts/**` | Admin HTTP routes |
| `apps/web/app/admin/payment-accounts/**` | Admin UI |
| `apps/web/app/admin/_components/admin-nav.tsx` | Nav link |
| `apps/web/app/admin/settings/page.tsx` | View/edit group cards |
| `apps/web/app/admin/packages/new/page.tsx` + `[id]/page.tsx` | 2-col + banner + light chrome |
| `apps/web/src/services/admin-package-service.ts` | Require `bannerImage` |
| `apps/web/app/api/admin/uploads/image/route.ts` | Image upload → storage key |
| Admin pages under `apps/web/app/admin/**` | Strip `max-w-*` wrappers |

---

### Task 1: Full-width admin pages + light form primitives check

**Files:**
- Modify: all `apps/web/app/admin/**/page.tsx` that use `max-w-7xl|6xl|4xl|3xl|xl` on the main content wrapper (except `admin/login/page.tsx` keep `max-w-md` for the login card)
- Verify: `apps/web/app/admin/_components/ui.tsx` already exports `AdminInput`, `AdminSelect`, `AdminCard`, `AdminPageHeader`

**Interfaces:**
- Produces: full-width admin content area for later tasks

- [ ] **Step 1: Strip width constraints from list/dashboard/settings pages**

Replace wrappers like:

```tsx
<div className="mx-auto max-w-6xl">
```

with:

```tsx
<div className="w-full">
```

Do the same for `max-w-7xl`, `max-w-4xl` on settings. Leave `admin/login` card as `max-w-md`.

- [ ] **Step 2: Strip width from detail/new pages**

Replace:

```tsx
<main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
```

with (shell already pads):

```tsx
<div className="w-full flex flex-col gap-4">
```

Remove duplicate `min-h-screen` / outer `px-6 py-10` when inside `AdminShell` (shell provides `p-6`). Keep loading/error states consistent.

- [ ] **Step 3: Spot-check in browser**

Open `/admin` and `/admin/users` — content should span the main pane beside the sidebar.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin
git commit -m "style(admin): use full-width content panes"
```

---

### Task 2: Settings — view-only group cards with independent edit

**Files:**
- Modify: `apps/web/app/admin/settings/page.tsx`
- Reuse: `apps/web/src/settings/catalog.ts` (`SETTINGS_CATALOG` groups)
- Reuse: `GET/PATCH /api/admin/settings`

**Interfaces:**
- Consumes: `SETTINGS_CATALOG` items `{ key, value, group }`; API `{ updates: Record<string, string> }`
- Produces: per-group edit UX

- [ ] **Step 1: Rewrite settings page**

Implement approximately:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { SETTINGS_CATALOG } from "@/settings/catalog";
import { hasAnyPermission } from "@/permissions/visibility";
import { useAdminPermissions } from "../_components/admin-shell";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
} from "../_components/ui";

type Item = { key: string; value: string; group: string };

const GROUP_LABELS: Record<string, string> = {
  app: "App",
  investment: "Investment",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  returns: "Returns",
  security: "Security",
  notification: "Notification",
};

const GROUP_ORDER = [
  "app",
  "investment",
  "deposit",
  "withdrawal",
  "returns",
  "security",
  "notification",
];

export default function AdminSettingsPage() {
  const permissions = useAdminPermissions();
  const canUpdate = hasAnyPermission(permissions, ["settings.update"]);
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/settings");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    const list = json.data.items as Item[];
    setItems(list);
    setDraft(Object.fromEntries(list.map((i) => [i.key, i.value])));
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map(
      (g) => [g, map.get(g)!] as const,
    );
  }, [items]);

  async function saveGroup(group: string) {
    if (!canUpdate) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const groupKeys = new Set(
        SETTINGS_CATALOG.filter((c) => c.group === group).map((c) => c.key),
      );
      const updates: Record<string, string> = {};
      for (const item of items) {
        if (!groupKeys.has(item.key)) continue;
        if (draft[item.key] !== item.value) {
          updates[item.key] = draft[item.key] ?? item.value;
        }
      }
      if (Object.keys(updates).length === 0) {
        setMessage("No changes");
        setEditingGroup(null);
        return;
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Save failed");
        return;
      }
      setMessage("Settings saved");
      setEditingGroup(null);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function cancelGroup(group: string) {
    const next = { ...draft };
    for (const item of items) {
      if (item.group === group) next[item.key] = item.value;
    }
    setDraft(next);
    setEditingGroup(null);
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        title="System settings"
        subtitle="View platform configuration — edit one group at a time"
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      {message ? (
        <p className="mb-3 text-[var(--sp-lime-deep)]">{message}</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(([group, list]) => {
          const editing = editingGroup === group;
          return (
            <AdminCard key={group}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--sp-navy)]">
                  {GROUP_LABELS[group] ?? group}
                </h2>
                {canUpdate && !editing ? (
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--sp-border)] px-3 py-1.5 text-sm font-semibold text-[var(--sp-navy)] hover:bg-[var(--sp-lime-mint)]"
                    onClick={() => setEditingGroup(group)}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                {list.map((item) =>
                  editing ? (
                    <label key={item.key} className="text-sm">
                      <span className="font-mono text-xs font-semibold text-[var(--sp-lime-deep)]">
                        {item.key}
                      </span>
                      <AdminInput
                        className="mt-1 w-full"
                        value={draft[item.key] ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            [item.key]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ) : (
                    <div key={item.key} className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-[var(--sp-muted)]">
                        {item.key}
                      </span>
                      <span className="text-sm font-medium text-[var(--sp-navy)]">
                        {item.value}
                      </span>
                    </div>
                  ),
                )}
              </div>
              {editing ? (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    className="rounded-xl bg-[var(--sp-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => void saveGroup(group)}
                  >
                    {loading ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--sp-border)] px-4 py-2 text-sm font-semibold text-[var(--sp-muted)]"
                    onClick={() => cancelGroup(group)}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual verify**

Login as admin → `/admin/settings`: no inputs until Edit; editing Deposit does not show inputs on App; Save only changes that group.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/settings/page.tsx
git commit -m "feat(admin): view-only settings with per-group edit cards"
```

---

### Task 3: Schema + permissions for platform payment accounts

**Files:**
- Create: `database/schema/platform-payment-accounts.ts`
- Modify: `database/schema/index.ts`
- Modify: `database/seed/catalog.ts`
- Modify: `database/seed/catalog.test.ts`
- Generate migration via drizzle-kit

**Interfaces:**
- Produces: table `platform_payment_accounts`; perms `payment_accounts.read`, `payment_accounts.write`

- [ ] **Step 1: Add schema file**

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const platformPaymentAccounts = pgTable(
  "platform_payment_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // BANK | MOBILE_MONEY | OTHER
    label: text("label").notNull(),
    accountName: text("account_name").notNull(),
    accountNumber: text("account_number").notNull(),
    bankName: text("bank_name"),
    provider: text("provider"),
    notes: text("notes"),
    status: text("status").notNull().default("DISABLED"), // PUBLISHED | DISABLED
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("platform_payment_accounts_status_idx").on(t.status)],
);
```

Export from `database/schema/index.ts`:

```ts
export { platformPaymentAccounts } from "./platform-payment-accounts";
```

- [ ] **Step 2: Add permissions to catalog**

In `PERMISSION_CATALOG` add:

```ts
{ code: "payment_accounts.read", name: "Read platform payment accounts" },
{ code: "payment_accounts.write", name: "Manage platform payment accounts" },
```

Add both to `FINANCE_OFFICER` role array (they auto-flow to SUPER_ADMIN/ADMIN via `ALL_PERMISSION_CODES`).

Update `catalog.test.ts` expected permission list to include the two new codes.

- [ ] **Step 3: Generate and apply migration**

```bash
pnpm db:generate
sg docker -c 'pnpm db:migrate'
# then re-seed permissions via project seed command
```

Expected: migration SQL under `database/migrations/`; migrate succeeds; seed upserts new permissions.

- [ ] **Step 4: Run catalog test**

```bash
pnpm --filter @solar/database test -- catalog.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add database/schema database/migrations database/seed
git commit -m "feat(db): add platform_payment_accounts and RBAC permissions"
```

---

### Task 4: Payment account service + unit tests

**Files:**
- Create: `apps/web/src/services/platform-payment-account-service.ts`
- Create: `apps/web/src/services/platform-payment-account-service.test.ts`

**Interfaces:**
- Produces:
  - `formatPaymentInstructions(account): string`
  - `pickRandomPublishedAccount(accounts, random?: () => number): Account | null`
  - Admin CRUD: list/create/update/publish/disable/delete (delete only if DISABLED)
  - `listPublishedPaymentAccounts(): Promise<Account[]>`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  formatPaymentInstructions,
  pickRandomPublishedAccount,
} from "./platform-payment-account-service";

const bank = {
  id: "1",
  type: "BANK",
  label: "Main",
  accountName: "SPEED PAY LTD",
  accountNumber: "0123456789",
  bankName: "Demo Bank",
  provider: null,
  notes: "Use your email as narration",
  status: "PUBLISHED",
};

const momo = {
  ...bank,
  id: "2",
  type: "MOBILE_MONEY",
  bankName: null,
  provider: "MTN",
  accountNumber: "08012345678",
};

describe("pickRandomPublishedAccount", () => {
  it("returns null when empty", () => {
    expect(pickRandomPublishedAccount([])).toBeNull();
  });

  it("returns the only published account", () => {
    expect(pickRandomPublishedAccount([bank], () => 0)).toEqual(bank);
  });

  it("uses random index among accounts", () => {
    expect(pickRandomPublishedAccount([bank, momo], () => 0.99)).toEqual(momo);
  });
});

describe("formatPaymentInstructions", () => {
  it("includes bank fields", () => {
    const s = formatPaymentInstructions(bank);
    expect(s).toContain("Demo Bank");
    expect(s).toContain("0123456789");
    expect(s).toContain("SPEED PAY LTD");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm --filter @solar/web test -- platform-payment-account-service.test.ts
```

Expected: FAIL module not found / exports missing

- [ ] **Step 3: Implement service helpers + CRUD**

Create `apps/web/src/services/platform-payment-account-service.ts` with:

- `pickRandomPublishedAccount` / `formatPaymentInstructions` as in the tests
- `listPaymentAccounts`, `listPublishedPaymentAccounts`, `createPaymentAccount` (status `DISABLED`), `updatePaymentAccount`, `publishPaymentAccount`, `disablePaymentAccount`, `deletePaymentAccount` (only when DISABLED)
- Permission checks via `adminHasPermission` for `payment_accounts.read` / `payment_accounts.write`
- Audit actions: `PAYMENT_ACCOUNT_CREATED|UPDATED|PUBLISHED|DISABLED|DELETED`
- Match `writeAdminAudit` signature to `apps/web/src/audit/write-admin-audit.ts` (adjust if the project uses different field names)

Validate type ∈ `BANK|MOBILE_MONEY|OTHER`; require non-empty `label`, `accountName`, `accountNumber`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @solar/web test -- platform-payment-account-service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/platform-payment-account-service.ts apps/web/src/services/platform-payment-account-service.test.ts
git commit -m "feat(web): platform payment account service and selection helpers"
```

---

### Task 5: Admin payment-accounts API + UI + nav

**Files:**
- Create: `apps/web/app/api/admin/payment-accounts/route.ts`
- Create: `apps/web/app/api/admin/payment-accounts/[id]/route.ts`
- Create: `apps/web/app/api/admin/payment-accounts/[id]/publish/route.ts`
- Create: `apps/web/app/api/admin/payment-accounts/[id]/disable/route.ts`
- Create: `apps/web/app/admin/payment-accounts/page.tsx`
- Create: `apps/web/app/admin/payment-accounts/new/page.tsx`
- Create: `apps/web/app/admin/payment-accounts/[id]/page.tsx`
- Modify: `apps/web/app/admin/_components/admin-nav.tsx`

**Interfaces:**
- Consumes: service from Task 4
- Produces: `/admin/payment-accounts` UI

- [ ] **Step 1: Add nav link** (ops group, after Deposits):

```ts
{
  href: "/admin/payment-accounts",
  label: "Payment accounts",
  group: "ops",
  permissions: ["payment_accounts.read"],
},
```

- [ ] **Step 2: API routes**

Follow patterns in `apps/web/app/api/admin/packages/route.ts`:
- resolve admin session
- call service
- return `jsonOk` / `jsonError`

`GET/POST /api/admin/payment-accounts`  
`GET/PATCH/DELETE /api/admin/payment-accounts/[id]`  
`POST .../publish` and `.../disable`

- [ ] **Step 3: List + detail UI**

List page: full-width `AdminTable` columns Label, Type, Account name, Number, Status, actions (Open / Publish / Disable).  
Form pages: 2-column light `AdminInput`/`AdminSelect` for type, label, accountName, accountNumber, bankName, provider, notes. Status pills via `StatusPill`.

- [ ] **Step 4: Manual verify**

Create account → stays DISABLED → Publish → appears published → Disable → Publish again.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/admin/payment-accounts apps/web/app/admin/payment-accounts apps/web/app/admin/_components/admin-nav.tsx
git commit -m "feat(admin): payment accounts CRUD UI and API"
```

---

### Task 6: Wire deposits to random published account

**Files:**
- Modify: `apps/web/src/services/deposit-service.ts`

**Interfaces:**
- Consumes: `listPublishedPaymentAccounts`, `pickRandomPublishedAccount`, `formatPaymentInstructions`
- Produces: deposit `payment.instructions` from selected account; 400 if none published

- [ ] **Step 1: Update `createDeposit`**

Check published accounts **before** inserting the deposit row:

```ts
import {
  formatPaymentInstructions,
  listPublishedPaymentAccounts,
  pickRandomPublishedAccount,
} from "@/services/platform-payment-account-service";

const published = await listPublishedPaymentAccounts();
const selected = pickRandomPublishedAccount(published);
if (!selected) {
  throw new AppError(
    "VALIDATION_ERROR",
    "No published payment accounts available. Contact support.",
    400,
  );
}

// ... existing insert + provider.initialize ...

return {
  deposit: updated!,
  payment: {
    providerRef: init.providerRef,
    paymentUrl: init.paymentUrl,
    instructions: formatPaymentInstructions(selected),
    account: {
      id: selected.id,
      type: selected.type,
      accountName: selected.accountName,
      accountNumber: selected.accountNumber,
      bankName: selected.bankName,
      provider: selected.provider,
      notes: selected.notes,
    },
  },
};
```

- [ ] **Step 2: Manual verify**

With 0 published → deposit fails. With 1 → instructions match. With 2 → create deposits repeatedly and confirm both appear over several tries.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/services/deposit-service.ts
git commit -m "feat(deposits): use random published platform payment account"
```

---

### Task 7: Package banner column + validation

**Files:**
- Modify: `database/schema/investment-packages.ts`
- Generate migration
- Modify: `apps/web/src/services/admin-package-service.ts` (`PackageInput` + validation)
- Modify: `apps/web/src/services/admin-package-service.test.ts`

**Interfaces:**
- Produces: `bannerImage: string` required on create/update

- [ ] **Step 1: Schema**

Add to `investmentPackages`:

```ts
bannerImage: text("banner_image"),
```

Generate + migrate.

- [ ] **Step 2: Extend PackageInput and validation**

```ts
export type PackageInput = {
  // ...existing fields
  bannerImage: string;
};

export function validatePackageInput(input: PackageInput) {
  // move existing validateTerms checks here
  if (!input.bannerImage?.trim()) {
    throw new AppError("VALIDATION_ERROR", "Banner image is required.", 400);
  }
}
```

Include `bannerImage` in insert/update values. Call `validatePackageInput` from create/update paths.

- [ ] **Step 3: Unit test**

```ts
it("requires bannerImage", () => {
  expect(() =>
    validatePackageInput({
      projectId: "x",
      name: "n",
      lotPrice: "100",
      totalLots: 1,
      returnType: "FIXED_RETURN",
      returnRate: "0.1",
      durationDays: 30,
      bannerImage: "",
    }),
  ).toThrow(/Banner/);
});
```

- [ ] **Step 4: Commit**

```bash
git add database/schema/investment-packages.ts database/migrations apps/web/src/services/admin-package-service.ts apps/web/src/services/admin-package-service.test.ts
git commit -m "feat(packages): require bannerImage on package create/update"
```

---

### Task 8: Upload endpoint + two-column package forms (light chrome)

**Files:**
- Create: `apps/web/app/api/admin/uploads/image/route.ts`
- Modify: `apps/web/app/admin/packages/new/page.tsx`
- Modify: `apps/web/app/admin/packages/[id]/page.tsx`

**Interfaces:**
- `POST /api/admin/uploads/image` multipart field `file` → `{ success, data: { storageKey } }`
- Package forms send `bannerImage: storageKey`

- [ ] **Step 1: Upload route**

Require admin session + `packages.create` or `packages.update`.  
Validate `contentType` ∈ `image/jpeg|image/png|image/webp`.  
`key = packages/banners/${randomUUID()}.${ext}`  
`await getStorage().put(key, buffer, contentType)`  
Return `jsonOk({ storageKey: key })`.

- [ ] **Step 2: Rewrite new package page**

- Full width, `grid gap-6 lg:grid-cols-2`
- Left card: project select, name, description, banner file input + preview; upload on file select (store `storageKey`)
- Right card: lotPrice, lots, return fields
- All inputs: `AdminInput` / `AdminSelect` (no slate-900)
- On submit: ensure `bannerImage` set; `POST /api/admin/packages`

- [ ] **Step 3: Rewrite edit package page** same layout; allow replacing banner

- [ ] **Step 4: Manual verify**

Create package without banner → error. With banner → success. Form uses navy/lime styling.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/admin/uploads apps/web/app/admin/packages
git commit -m "feat(admin): two-column package forms with banner upload"
```

---

### Task 9: Smoke verification

- [ ] **Step 1: Run tests**

```bash
pnpm --filter @solar/web test
pnpm --filter @solar/database test
```

Expected: PASS (or only pre-existing failures unrelated to this work)

- [ ] **Step 2: Browser checklist**

1. `/admin/settings` — 2-col cards, view-only, per-group Edit  
2. `/admin/payment-accounts` — CRUD, Publish/Disable  
3. Investor deposit with 2 published accounts — random instructions  
4. `/admin/packages/new` — 2-col, banner required, light form  
5. Pages full width  

- [ ] **Step 3: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: polish settings, payment accounts, and package banner UX"
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Full-width admin pages | 1 |
| Settings view-only + per-group edit + 2-col cards | 2 |
| Similar keys same card | 2 (`SETTINGS_CATALOG` groups) |
| `platform_payment_accounts` schema | 3 |
| Admin CRUD + Publish/Disable | 4–5 |
| Random every deposit | 6 |
| Fail if none published | 6 |
| Package 2-col + banner required | 7–8 |
| Light brand form chrome | 1, 5, 8 |
| Permissions | 3 |
| Nav under Operations | 5 |

## Placeholder / consistency review

- No TBD left; `writeAdminAudit` call shape must match existing helper (adjust in Task 4 if signature differs).
- `pickRandomPublishedAccount` / `formatPaymentInstructions` names consistent across Tasks 4 and 6.
- `bannerImage` camelCase in TS / `banner_image` in DB via Drizzle.
