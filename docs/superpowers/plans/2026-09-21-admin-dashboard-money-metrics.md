# Admin Dashboard Money Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose portfolio money aggregates on `GET /api/admin/dashboard` and render a seven-tile money strip on the admin overview under the ops count strip.

**Architecture:** Pure helpers in `apps/web/src/lib/dashboard-money.ts` compute expected maturity value and returns-credited composition (unit-tested). `getAdminDashboard` runs SQL aggregates + ACTIVE row fetch, then maps through those helpers into a `money` object. The admin dashboard page types `money` and renders a bordered money strip inside the existing overview `AdminCard` between counts and the invested chart.

**Tech Stack:** Next.js App Router, Drizzle/Postgres, Vitest, existing `calculateInvestmentReturn`, `formatAmount`, admin RBAC.

**Spec:** `docs/superpowers/specs/2026-09-21-admin-dashboard-money-metrics-design.md`

## Global Constraints

- No schema migrations.
- Keep ops count strip, invested-amount chart, Packages & subscribers cards unchanged in behavior.
- `returnsCredited` = `SUM(maturities.expected_return)` + `SUM(delta_accrued)` for investments still `ACTIVE` only.
- `expectedMaturityValue` via `calculateInvestmentReturn(...).maturityValue`; skip rows where `maturityAt < startAt`.
- `walletLiability` = sum of ledger entry amounts for `AVAILABLE` + `PENDING`.
- Currency field: `"NGN"` (platform default).
- Permissions: unchanged dashboard any-of set.

---

## File map

| Path | Responsibility |
|------|----------------|
| `apps/web/src/lib/dashboard-money.ts` | Pure helpers: sum expected maturity, compose returns credited, round money |
| `apps/web/src/lib/dashboard-money.test.ts` | Unit tests for helpers |
| `apps/web/src/services/admin-dashboard-service.ts` | SQL aggregates + wire `money` onto dashboard payload |
| `apps/web/app/admin/page.tsx` | Type `money`, render money strip UI |

No API route file changes required (`app/api/admin/dashboard/route.ts` already returns `getAdminDashboard` result wholesale).

---

### Task 1: Pure dashboard money helpers + tests

**Files:**
- Create: `apps/web/src/lib/dashboard-money.ts`
- Create: `apps/web/src/lib/dashboard-money.test.ts`

**Interfaces:**
- Consumes: `calculateInvestmentReturn` from `@/calculations/investment-return`
- Produces:
  - `export type ActiveInvestmentMoneyInput = { principal: number; returnRate: string; returnType: string; startAt: Date; maturityAt: Date }`
  - `export function sumExpectedMaturityValue(rows: ActiveInvestmentMoneyInput[]): number`
  - `export function composeReturnsCredited(input: { maturedExpectedReturn: number; activeAccrualDelta: number }): number`
  - `export type DashboardMoney = { activePrincipal: number; expectedMaturityValue: number; maturedPrincipal: number; returnsCredited: number; walletLiability: number; pendingDepositAmount: number; pendingWithdrawalAmount: number; currency: string }`
  - `export function buildDashboardMoney(parts: Omit<DashboardMoney, "returnsCredited" | "expectedMaturityValue" | "currency"> & { activeInvestments: ActiveInvestmentMoneyInput[]; maturedExpectedReturn: number; activeAccrualDelta: number; currency?: string }): DashboardMoney`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/lib/dashboard-money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildDashboardMoney,
  composeReturnsCredited,
  sumExpectedMaturityValue,
} from "@/lib/dashboard-money";

describe("sumExpectedMaturityValue", () => {
  it("sums maturityValue for valid ACTIVE rows (10% of 1000 → 1100)", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const maturity = new Date("2026-07-01T00:00:00.000Z");
    const total = sumExpectedMaturityValue([
      {
        principal: 1000,
        returnRate: "10",
        returnType: "FIXED_RETURN",
        startAt: start,
        maturityAt: maturity,
      },
      {
        principal: 500,
        returnRate: "20",
        returnType: "FIXED_RETURN",
        startAt: start,
        maturityAt: maturity,
      },
    ]);
    // 1000+100 + 500+100 = 1700
    expect(total).toBe(1700);
  });

  it("skips corrupt rows where maturityAt < startAt", () => {
    const start = new Date("2026-07-01T00:00:00.000Z");
    const maturity = new Date("2026-01-01T00:00:00.000Z");
    const total = sumExpectedMaturityValue([
      {
        principal: 1000,
        returnRate: "10",
        returnType: "FIXED_RETURN",
        startAt: start,
        maturityAt: maturity,
      },
    ]);
    expect(total).toBe(0);
  });
});

describe("composeReturnsCredited", () => {
  it("adds matured expected return and ACTIVE-only accrual deltas", () => {
    expect(
      composeReturnsCredited({
        maturedExpectedReturn: 250,
        activeAccrualDelta: 40,
      }),
    ).toBe(290);
  });
});

describe("buildDashboardMoney", () => {
  it("assembles the money payload", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const maturity = new Date("2026-07-01T00:00:00.000Z");
    const money = buildDashboardMoney({
      activePrincipal: 1000,
      maturedPrincipal: 2000,
      walletLiability: 1500,
      pendingDepositAmount: 100,
      pendingWithdrawalAmount: 50,
      maturedExpectedReturn: 200,
      activeAccrualDelta: 25,
      activeInvestments: [
        {
          principal: 1000,
          returnRate: "10",
          returnType: "FIXED_RETURN",
          startAt: start,
          maturityAt: maturity,
        },
      ],
    });
    expect(money).toEqual({
      activePrincipal: 1000,
      expectedMaturityValue: 1100,
      maturedPrincipal: 2000,
      returnsCredited: 225,
      walletLiability: 1500,
      pendingDepositAmount: 100,
      pendingWithdrawalAmount: 50,
      currency: "NGN",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm exec vitest run src/lib/dashboard-money.test.ts`

Expected: FAIL — cannot resolve `@/lib/dashboard-money` (or module not found).

- [ ] **Step 3: Implement helpers**

Create `apps/web/src/lib/dashboard-money.ts`:

```ts
import { calculateInvestmentReturn } from "@/calculations/investment-return";

export type ActiveInvestmentMoneyInput = {
  principal: number;
  returnRate: string;
  returnType: string;
  startAt: Date;
  maturityAt: Date;
};

export type DashboardMoney = {
  activePrincipal: number;
  expectedMaturityValue: number;
  maturedPrincipal: number;
  returnsCredited: number;
  walletLiability: number;
  pendingDepositAmount: number;
  pendingWithdrawalAmount: number;
  currency: string;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sumExpectedMaturityValue(
  rows: ActiveInvestmentMoneyInput[],
): number {
  let total = 0;
  for (const row of rows) {
    if (
      !(row.startAt instanceof Date) ||
      Number.isNaN(row.startAt.getTime()) ||
      !(row.maturityAt instanceof Date) ||
      Number.isNaN(row.maturityAt.getTime()) ||
      row.maturityAt.getTime() < row.startAt.getTime()
    ) {
      continue;
    }
    try {
      const calc = calculateInvestmentReturn({
        principal: row.principal,
        returnRate: row.returnRate,
        returnType: row.returnType,
        startAt: row.startAt,
        maturityAt: row.maturityAt,
      });
      total += calc.maturityValue;
    } catch {
      // Skip rows that fail rate/type validation.
    }
  }
  return roundMoney(total);
}

export function composeReturnsCredited(input: {
  maturedExpectedReturn: number;
  activeAccrualDelta: number;
}): number {
  return roundMoney(
    (Number(input.maturedExpectedReturn) || 0) +
      (Number(input.activeAccrualDelta) || 0),
  );
}

export function buildDashboardMoney(
  parts: {
    activePrincipal: number;
    maturedPrincipal: number;
    walletLiability: number;
    pendingDepositAmount: number;
    pendingWithdrawalAmount: number;
    maturedExpectedReturn: number;
    activeAccrualDelta: number;
    activeInvestments: ActiveInvestmentMoneyInput[];
    currency?: string;
  },
): DashboardMoney {
  return {
    activePrincipal: roundMoney(Number(parts.activePrincipal) || 0),
    expectedMaturityValue: sumExpectedMaturityValue(parts.activeInvestments),
    maturedPrincipal: roundMoney(Number(parts.maturedPrincipal) || 0),
    returnsCredited: composeReturnsCredited({
      maturedExpectedReturn: parts.maturedExpectedReturn,
      activeAccrualDelta: parts.activeAccrualDelta,
    }),
    walletLiability: roundMoney(Number(parts.walletLiability) || 0),
    pendingDepositAmount: roundMoney(Number(parts.pendingDepositAmount) || 0),
    pendingWithdrawalAmount: roundMoney(
      Number(parts.pendingWithdrawalAmount) || 0,
    ),
    currency: parts.currency ?? "NGN",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm exec vitest run src/lib/dashboard-money.test.ts`

Expected: PASS (3 describe blocks, all green).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/dashboard-money.ts apps/web/src/lib/dashboard-money.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add dashboard money aggregation helpers

EOF
)"
```

---

### Task 2: Wire `money` into `getAdminDashboard`

**Files:**
- Modify: `apps/web/src/services/admin-dashboard-service.ts`

**Interfaces:**
- Consumes: `buildDashboardMoney` from `@/lib/dashboard-money`
- Produces: dashboard return value includes `money: DashboardMoney`

- [ ] **Step 1: Extend imports and queries**

In `apps/web/src/services/admin-dashboard-service.ts`, update imports to include `and`, `inArray`, and schema tables `investmentAccruals`, `ledgerAccounts`, `ledgerEntries`, `maturities`. Import `buildDashboardMoney`.

Replace the `Promise.all` block so that in addition to existing queries it also fetches:

1. `[activePrincipalRow]` — `SUM(investments.principal)` where `status = 'ACTIVE'`
2. `activeInvestmentRows` — select `principal`, `returnRate`, `returnType`, `startAt`, `maturityAt` where `status = 'ACTIVE'`
3. `[maturedPrincipalRow]` — `SUM(maturities.principal)`
4. `[maturedExpectedReturnRow]` — `SUM(maturities.expectedReturn)`
5. `[activeAccrualRow]` — `SUM(investmentAccruals.deltaAccrued)` inner-joined to `investments` where `investments.status = 'ACTIVE'`
6. `[walletLiabilityRow]` — `SUM(ledgerEntries.amount)` inner-joined to `ledgerAccounts` where `ledgerAccounts.code` in `('AVAILABLE','PENDING')`
7. `[pendingDepositAmountRow]` — `SUM(deposits.amount)` where `status = 'PENDING'`
8. `[pendingWithdrawalAmountRow]` — `SUM(withdrawals.amount)` where `status = 'PENDING'`

Keep existing count / daily / adoption queries.

Concrete query snippets to add inside the same `Promise.all` (or a second `Promise.all` immediately after if the array grows unwieldy — either is fine; prefer one batch):

```ts
db
  .select({
    total: sql<number>`coalesce(sum(${investments.principal}), 0)`.mapWith(Number),
  })
  .from(investments)
  .where(eq(investments.status, "ACTIVE")),

db
  .select({
    principal: investments.principal,
    returnRate: investments.returnRate,
    returnType: investments.returnType,
    startAt: investments.startAt,
    maturityAt: investments.maturityAt,
  })
  .from(investments)
  .where(eq(investments.status, "ACTIVE")),

db
  .select({
    total: sql<number>`coalesce(sum(${maturities.principal}), 0)`.mapWith(Number),
  })
  .from(maturities),

db
  .select({
    total: sql<number>`coalesce(sum(${maturities.expectedReturn}), 0)`.mapWith(
      Number,
    ),
  })
  .from(maturities),

db
  .select({
    total: sql<number>`coalesce(sum(${investmentAccruals.deltaAccrued}), 0)`.mapWith(
      Number,
    ),
  })
  .from(investmentAccruals)
  .innerJoin(
    investments,
    eq(investmentAccruals.investmentId, investments.id),
  )
  .where(eq(investments.status, "ACTIVE")),

db
  .select({
    total: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)`.mapWith(Number),
  })
  .from(ledgerEntries)
  .innerJoin(
    ledgerAccounts,
    eq(ledgerEntries.ledgerAccountId, ledgerAccounts.id),
  )
  .where(inArray(ledgerAccounts.code, ["AVAILABLE", "PENDING"])),

db
  .select({
    total: sql<number>`coalesce(sum(${deposits.amount}), 0)`.mapWith(Number),
  })
  .from(deposits)
  .where(eq(deposits.status, "PENDING")),

db
  .select({
    total: sql<number>`coalesce(sum(${withdrawals.amount}), 0)`.mapWith(Number),
  })
  .from(withdrawals)
  .where(eq(withdrawals.status, "PENDING")),
```

Destructure results carefully — keep existing variable names for counts/daily/adoption and add the new ones.

- [ ] **Step 2: Attach `money` on the return object**

```ts
money: buildDashboardMoney({
  activePrincipal: activePrincipalRow?.total ?? 0,
  maturedPrincipal: maturedPrincipalRow?.total ?? 0,
  walletLiability: walletLiabilityRow?.total ?? 0,
  pendingDepositAmount: pendingDepositAmountRow?.total ?? 0,
  pendingWithdrawalAmount: pendingWithdrawalAmountRow?.total ?? 0,
  maturedExpectedReturn: maturedExpectedReturnRow?.total ?? 0,
  activeAccrualDelta: activeAccrualRow?.total ?? 0,
  activeInvestments: activeInvestmentRows.map((row) => ({
    principal: Number(row.principal) || 0,
    returnRate: String(row.returnRate),
    returnType: String(row.returnType),
    startAt: row.startAt,
    maturityAt: row.maturityAt,
  })),
  currency: "NGN",
}),
```

Leave `adoption` in the payload (unused by UI; out of scope to remove).

Full updated import block should look like:

```ts
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import {
  deposits,
  investmentAccruals,
  investmentPackages,
  investments,
  ledgerAccounts,
  ledgerEntries,
  maturities,
  payoutAccounts,
  users,
  verificationRequests,
  withdrawals,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { seriesForPeriod } from "@/lib/dashboard-charts";
import { buildDashboardMoney } from "@/lib/dashboard-money";
import { requireAnyAdminPermission } from "@/permissions/check";
```

(`and` only if used; omit if unused.)

- [ ] **Step 3: Re-run helper tests (regression)**

Run: `cd apps/web && pnpm exec vitest run src/lib/dashboard-money.test.ts`

Expected: PASS.

- [ ] **Step 4: Typecheck service (optional smoke)**

Run: `cd apps/web && pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | head -40`

Expected: no errors in `admin-dashboard-service.ts` / `dashboard-money.ts`. If unrelated pre-existing errors appear elsewhere, ignore them for this task as long as the money files are clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/admin-dashboard-service.ts
git commit -m "$(cat <<'EOF'
feat(admin): expose money aggregates on dashboard API

EOF
)"
```

---

### Task 3: Money strip UI on admin dashboard

**Files:**
- Modify: `apps/web/app/admin/page.tsx`

**Interfaces:**
- Consumes: `data.money` from `/api/admin/dashboard` with the `DashboardMoney` shape
- Produces: seven linked/unlinked money tiles between ops counts and invested chart

- [ ] **Step 1: Extend the `Dashboard` type**

```ts
type Dashboard = {
  totalUsers: number;
  kycPending: number;
  openPackages: number;
  activeInvestments: number;
  pendingWithdrawals: number;
  pendingPayoutAccounts: number;
  pendingDeposits: number;
  dailyInvested: DailyPoint[];
  money: {
    activePrincipal: number;
    expectedMaturityValue: number;
    maturedPrincipal: number;
    returnsCredited: number;
    walletLiability: number;
    pendingDepositAmount: number;
    pendingWithdrawalAmount: number;
    currency: string;
  };
};
```

- [ ] **Step 2: Insert money strip markup**

Inside the overview `AdminCard`, after the ops count grid `</div>` and before the invested chart wrapper, insert:

```tsx
<div className="border-t border-[var(--sp-border)]">
  <div className="grid grid-cols-2 divide-x divide-y divide-[var(--sp-border)] md:grid-cols-3 xl:grid-cols-7 xl:divide-y-0">
    {[
      {
        title: "Active principal",
        value: data.money?.activePrincipal ?? 0,
        href: "/admin/investments",
      },
      {
        title: "Expected maturity",
        value: data.money?.expectedMaturityValue ?? 0,
        href: "/admin/investments",
      },
      {
        title: "Matured principal",
        value: data.money?.maturedPrincipal ?? 0,
        href: "/admin/maturities",
      },
      {
        title: "Returns credited",
        value: data.money?.returnsCredited ?? 0,
        href: "/admin/returns",
      },
      {
        title: "Wallet liability",
        value: data.money?.walletLiability ?? 0,
        href: "/admin/users",
      },
      {
        title: "Pending deposits",
        value: data.money?.pendingDepositAmount ?? 0,
        href: "/admin/deposits",
      },
      {
        title: "Pending withdrawals",
        value: data.money?.pendingWithdrawalAmount ?? 0,
        href: "/admin/withdrawals",
      },
    ].map((tile) => (
      <Link
        key={tile.title}
        href={tile.href}
        className="px-3 py-3 transition hover:bg-[var(--sp-surface)]"
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--sp-muted)]">
          {tile.title}
        </p>
        <p className="mt-1 text-base font-bold text-[var(--sp-navy)] sm:text-lg">
          {formatAmount(tile.value, data.money?.currency ?? "NGN")}
        </p>
      </Link>
    ))}
  </div>
</div>
```

Keep the chart block immediately after:

```tsx
<div className="border-t border-[var(--sp-border)] p-4">
  <InvestedAmountChart points={data.dailyInvested ?? []} />
</div>
```

Do not change Packages & subscribers or Recent deposits.

- [ ] **Step 3: Manual verify**

1. Ensure web app is running (`pnpm --filter web dev` or existing process).
2. Open `/admin` as seeded admin.
3. Confirm seven money tiles appear under the four ops counts and above the invested chart.
4. Confirm amounts are non-empty numbers (zeros OK on empty DB) with `NGN`.
5. Confirm package cards and chart still render.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/page.tsx
git commit -m "$(cat <<'EOF'
feat(admin): show portfolio money strip on dashboard

EOF
)"
```

---

### Task 4: Spec acceptance pass

**Files:** none (verification only)

- [ ] **Step 1: Re-run unit tests**

Run: `cd apps/web && pnpm exec vitest run src/lib/dashboard-money.test.ts`

Expected: PASS.

- [ ] **Step 2: Spot-check acceptance against spec §8**

| # | Check | How |
|---|---|---|
| 1 | Seven money amounts with labels | Visual on `/admin` |
| 2 | ACTIVE purchase bumps active principal / expected maturity | Optional: buy via mobile/portal or trust SQL definitions if time-boxed |
| 3 | Maturity moves book → matured / returns | Optional / skip if no ready matured fixture |
| 4 | Pending deposit/withdrawal amounts | Create or inspect PENDING rows vs tile |
| 5 | Wallet liability = AVAILABLE+PENDING | Compare tile to a known wallet if convenient |
| 6 | Ops counts, chart, package cards still work | Visual |

Minimum for “done”: checks 1 and 6 green + unit tests green. Checks 2–5 are best-effort with seed/e2e data.

- [ ] **Step 3: Final commit only if Task 3 left uncommitted fixes**

If Step 2 required UI tweaks, commit them:

```bash
git add apps/web/app/admin/page.tsx
git commit -m "$(cat <<'EOF'
fix(admin): polish dashboard money strip

EOF
)"
```

Otherwise no commit.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Option B metrics | Task 1–2 |
| Approach 1 extend dashboard API | Task 2 |
| Money strip under ops counts | Task 3 |
| returnsCredited formula | Task 1 `composeReturnsCredited` + Task 2 SQL join ACTIVE |
| expectedMaturityValue via calculateInvestmentReturn + skip bad dates | Task 1 |
| walletLiability AVAILABLE+PENDING | Task 2 |
| pending deposit/withdrawal amounts | Task 2–3 |
| No migration; keep ops/chart/packages | Global + Task 3 |
| Tests for helpers | Task 1 |
| Acceptance | Task 4 |

No placeholders remaining. Types consistent: `DashboardMoney` / `buildDashboardMoney` used by service and mirrored in page type.
