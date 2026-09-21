# Admin Dashboard Money Metrics

**Date:** 2026-09-21  
**Status:** Approved — ready for implementation plan  
**Product:** Solar Investment Platform (SPEED PAY admin)  
**Depends on:** Existing `/api/admin/dashboard`, `getAdminDashboard`, admin dashboard page, `calculateInvestmentReturn`, ledger (`AVAILABLE` / `PENDING`), `maturities`, `investment_accruals`  
**Scope:** Add a portfolio money strip to the admin dashboard (Approach 1 / Option B metrics). No schema migration. Ops count strip, invested-amount chart, and Packages & subscribers cards stay as they are.

---

## 1. Goal

Give admins an at-a-glance money picture on `/admin`: active book, expected maturity payout, matured principal, returns already credited, wallet liability, and pending deposit/withdrawal amounts — without replacing queue/ops counts or the package subscriber cards.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Metric set | Option B: portfolio money + returns credited + wallet liability + pending deposit/withdrawal amounts |
| Delivery | Approach 1: extend `getAdminDashboard` / `/api/admin/dashboard` + money KPI strip on the page |
| Ops strip | Keep existing 4 count tiles (queues, active investments, open packages, users) |
| Charts / packages | Keep invested-amount chart; keep Packages & subscribers cards (no adoption bars) |
| Schema | No new tables or migrations |
| Currency | Platform default already used by `formatAmount` (NGN); expose `currency` on payload for clarity |

---

## 3. Money metrics (definitions)

All amounts use the same numeric units as the rest of the admin UI (passed through `formatAmount`).

| Field | Meaning | Source of truth |
|---|---|---|
| `activePrincipal` | Capital in live positions | `SUM(investments.principal)` where `status = 'ACTIVE'` |
| `expectedMaturityValue` | What the ACTIVE book should pay at maturity (principal + expected return) | For each ACTIVE investment, `calculateInvestmentReturn(...).maturityValue`, then sum (matches purchase/returns math) |
| `maturedPrincipal` | Principal already processed through maturity | `SUM(maturities.principal)` |
| `returnsCredited` | Return money already put on wallets, without double-counting | `SUM(maturities.expected_return)` + `SUM(investment_accruals.delta_accrued)` **only for investments still `ACTIVE`** |
| `walletLiability` | Investor balances still on the platform | Sum of `ledger_entries.amount` for accounts with `code IN ('AVAILABLE','PENDING')` |
| `pendingDepositAmount` | Inbound cash waiting review | `SUM(deposits.amount)` where `status = 'PENDING'` |
| `pendingWithdrawalAmount` | Outbound cash waiting review | `SUM(withdrawals.amount)` where `status = 'PENDING'` |

### 3.1 Returns credited rationale

- Accruals credit `PENDING` via `delta_accrued` while an investment is live.
- At maturity, pending accruals are settled and `maturities.expected_return` holds the full return for that investment.
- Summing all-time accruals **plus** matured expected return would double-count. Restrict accrual sum to `ACTIVE` investments only.

### 3.2 Expected maturity value

- Prefer calling `calculateInvestmentReturn` in the service (or a small helper that maps ACTIVE rows → sum of `maturityValue`) so rate parsing and rounding match production.
- Skip corrupt ACTIVE rows (`maturityAt < startAt`) the same way returns/maturity admin lists do, so one bad e2e row cannot zero or crash the dashboard.

---

## 4. API

**Endpoint:** `GET /api/admin/dashboard` (unchanged path)  
**Auth / permissions:** unchanged — existing `requireAnyAdminPermission` set on `getAdminDashboard`.

**Add to dashboard payload:**

```ts
money: {
  activePrincipal: number;
  expectedMaturityValue: number;
  maturedPrincipal: number;
  returnsCredited: number;
  walletLiability: number;
  pendingDepositAmount: number;
  pendingWithdrawalAmount: number;
  currency: string; // e.g. "NGN"
}
```

- Existing fields (`totalUsers`, queue counts, `dailyInvested`, etc.) remain.
- `adoption` may remain on the API for now but is unused by the dashboard UI (packages section uses investment cards). No requirement to remove it in this change.

Queries run in the same `Promise.all` batch as today’s counts (or an adjacent batch) to keep latency acceptable. Prefer SQL aggregates for sums/counts; only fetch ACTIVE investment rows needed for maturity-value calculation (id, principal, returnRate, returnType, startAt, maturityAt).

---

## 5. UI

- Location: `/admin` (`apps/web/app/admin/page.tsx`).
- Place a **money strip** directly under the existing ops count strip (and above or still wrapping with the invested chart as today — money strip sits between the count row and the chart inside the same card, or as its own `AdminCard` immediately below the overview card). Preferred: same overview `AdminCard`, border-top separator, then money tiles, then chart.
- Seven compact tiles with short labels:
  1. Active principal  
  2. Expected maturity value  
  3. Matured principal  
  4. Returns credited  
  5. Wallet liability  
  6. Pending deposits  
  7. Pending withdrawals  
- Values: `formatAmount(value, currency)` (or default currency if helper already implies it).
- Links (where obvious): pending deposits → `/admin/deposits`, pending withdrawals → `/admin/withdrawals`, matured principal → `/admin/maturities`, active principal / expected maturity → `/admin/investments`.
- Responsive: wrap; readable on mobile (2-col → more columns on xl).
- No new charts. Do not change Packages & subscribers or Recent deposits sections.

---

## 6. Out of scope

- Investor portal / Flutter dashboard
- New report exports (reports page already has its own summaries)
- Removing `adoption` from the API or deleting `AdoptionBarChart` (optional cleanup later)
- Multi-currency breakdown
- Accrued-but-not-yet-credited “paper” returns as a separate tile (covered implicitly inside expected maturity / live accruals path)

---

## 7. Testing

- Unit/service test for money aggregations with fixture-style SQL or mocked db if the repo pattern allows; otherwise extend an existing dashboard-related test if present.
- At minimum: pure helper test for `returnsCredited` composition and expected-maturity sum over a small ACTIVE set (including skipping bad date rows).
- Manual: load `/admin` with seed/e2e data and confirm tiles move when an investment is purchased, accrued, matured, or a deposit/withdrawal is pending.

---

## 8. Acceptance

1. Admin dashboard shows seven money amounts with correct labels.  
2. ACTIVE purchase increases active principal and expected maturity value.  
3. Processed maturity decreases active book metrics and increases matured principal / returns credited appropriately.  
4. Pending deposit and withdrawal amounts match sum of PENDING rows.  
5. Wallet liability equals AVAILABLE + PENDING ledger balances.  
6. Ops counts, invested chart, and package subscriber cards still work.
