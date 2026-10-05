# Investment Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Project and Package with standalone Investment plans (slots); website is admin-only; investors use the Flutter app.

**Architecture:** PostgreSQL `RENAME` keeps offer IDs. Drizzle tables become `investmentPlans` / `planVersions` / `investmentSlots`. Admin UI moves to `/admin/plans`. Investor APIs move to `/api/plans`. Next.js investor pages and project APIs are deleted. Flutter calls the new APIs and shows plan name + tracking metadata only.

**Tech Stack:** Next.js 15 App Router, Drizzle/PostgreSQL, Vitest, Flutter/Dart, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-09-28-investment-plans-design.md`

## Global Constraints

- Web (Next.js) = `/admin` only. Investors = Flutter app (`apps/mobile`), including Flutter web. Not a Next.js `/app` route.
- UI copy: **plan** and **slot**. Never package, project, or lot.
- Start date = when the investor buys, not when the plan fills.
- Old package/project URLs **404** (no aliases).
- Permission catalog length becomes **36**: drop `projects.*` (3) and `packages.*` (4), add `plans.create|update|activate|pause` (4).
- Do not change ledger reservation, ROI formula, or daily-task review rules — only the offer they hang off.
- Historical specs under `docs/superpowers/specs/2026-09-20-*` stay as archive.

---

## File map

**Create**
- `database/schema/investment-plans.ts`
- `database/schema/plan-versions.ts`
- `database/schema/investment-slots.ts`
- `database/migrations/0017_investment_plans.sql`
- `apps/web/src/lib/plan-funding.ts` (+ `.test.ts`)
- `apps/web/src/lib/plan-window.ts`
- `apps/web/src/services/admin-plan-service.ts` (+ `.test.ts`)
- `apps/web/app/api/admin/plans/**`
- `apps/web/app/api/plans/**`
- `apps/web/app/admin/plans/**`
- `apps/web/app/admin/_components/plan-funding.tsx`
- `apps/mobile/lib/features/marketplace/plan_detail_screen.dart`

**Delete**
- `database/schema/projects.ts`, `project-documents.ts`, `investment-packages.ts`, `package-versions.ts`, `investment-lots.ts`
- `apps/web/src/services/admin-project-service.ts` (+ test)
- `apps/web/src/services/admin-package-service.ts` (+ test) after rename
- `apps/web/app/admin/projects/**`, `apps/web/app/admin/packages/**`
- `apps/web/app/api/admin/projects/**`, `apps/web/app/api/admin/packages/**`, `apps/web/app/api/marketplace/**`
- `apps/web/app/(investor)/**`, `apps/web/app/(auth)/**`
- `apps/web/src/lib/package-funding.ts`, `package-window.ts`, `package-funding.test.ts`
- `apps/mobile/lib/features/marketplace/package_detail_screen.dart`

**Modify (high traffic)**
- `database/schema/index.ts`, `relations.ts`, `investments.ts`
- `database/seed/catalog.ts`, `catalog.test.ts`, `notification-templates.ts`
- `apps/web/src/services/{marketplace,purchase,reinvest,portfolio,returns,task}-service.ts` and admin equivalents
- `apps/web/app/admin/_components/admin-nav.tsx`, `admin-sidebar.tsx`
- `apps/web/app/page.tsx` → redirect `/admin/login`
- Flutter marketplace/portfolio/maturity/reinvest screens

---

### Task 1: `planFunding` helper

**Files:**
- Create: `apps/web/src/lib/plan-funding.ts`
- Create: `apps/web/src/lib/plan-funding.test.ts`
- Delete after Task 5: `apps/web/src/lib/package-funding.ts`, `package-funding.test.ts`

**Interfaces:**
- Produces: `planFunding({ slotPrice, totalSlots, soldSlots, returnRate? })` → `{ expected, invested, remaining, pct, rate, roiPerSlot, expectedRoi, investedRoi }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { planFunding } from "@/lib/plan-funding";

describe("planFunding", () => {
  it("computes expected, invested, and remaining raise", () => {
    expect(
      planFunding({ slotPrice: "1000", totalSlots: 100, soldSlots: 2 }),
    ).toEqual({
      expected: 100_000,
      invested: 2_000,
      remaining: 98_000,
      pct: 2,
      rate: 0,
      roiPerSlot: 0,
      expectedRoi: 0,
      investedRoi: 0,
    });
  });

  it("computes expected ROI from return rate", () => {
    const f = planFunding({
      slotPrice: "1000",
      totalSlots: 100,
      soldSlots: 2,
      returnRate: "12",
    });
    expect(f.roiPerSlot).toBe(120);
    expect(f.expectedRoi).toBe(12_000);
    expect(f.investedRoi).toBe(240);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @solar/web exec vitest run src/lib/plan-funding.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `planFunding`** (copy math from `packageFunding`, rename lot→slot)

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit** `test: add planFunding helper`

---

### Task 2: Permission catalog `plans.*`

**Files:**
- Modify: `database/seed/catalog.ts`
- Modify: `database/seed/catalog.test.ts`

**Interfaces:**
- Produces: permission codes `plans.create`, `plans.update`, `plans.activate`, `plans.pause`
- Removes: `projects.create|update|publish`, `packages.create|update|activate|pause`
- `PERMISSION_CATALOG` length **36**
- `INVESTMENT_MANAGER` gets the four `plans.*` codes (no projects/packages)
- Role description: `"Investment plans and investments"`

- [ ] **Step 1: Change catalog.test.ts** to expect `plans.*`, not `projects.*`/`packages.*`, length 36. Run: `pnpm --filter @solar/database exec vitest run seed/catalog.test.ts` — FAIL.

- [ ] **Step 2: Update `catalog.ts`**. Run tests — PASS.

- [ ] **Step 3: Commit** `feat: replace package/project permissions with plans`

---

### Task 3: Schema rename + drop projects

**Files:**
- Create: `database/schema/investment-plans.ts`, `plan-versions.ts`, `investment-slots.ts`
- Modify: `database/schema/investments.ts`, `index.ts`, `relations.ts`
- Delete: `projects.ts`, `project-documents.ts`, `investment-packages.ts`, `package-versions.ts`, `investment-lots.ts`
- Create: `database/migrations/0017_investment_plans.sql`
- Modify: `database/migrations/meta/_journal.json` (idx 17)
- Generate/update: `database/migrations/meta/0017_snapshot.json`

**SQL (0017)** — rename in place so IDs survive:

```sql
ALTER TABLE "investment_packages" DROP CONSTRAINT "investment_packages_project_id_projects_id_fk";
DROP INDEX IF EXISTS "investment_packages_project_id_idx";
ALTER TABLE "investment_packages" DROP COLUMN "project_id";

ALTER TABLE "investment_packages" RENAME TO "investment_plans";
ALTER TABLE "investment_plans" RENAME COLUMN "lot_price" TO "slot_price";
ALTER TABLE "investment_plans" RENAME COLUMN "total_lots" TO "total_slots";
ALTER TABLE "investment_plans" RENAME COLUMN "reserved_lots" TO "reserved_slots";
ALTER TABLE "investment_plans" RENAME COLUMN "sold_lots" TO "sold_slots";
ALTER TABLE "investment_plans" RENAME COLUMN "minimum_lots" TO "minimum_slots";
ALTER TABLE "investment_plans" RENAME COLUMN "maximum_lots" TO "maximum_slots";
ALTER INDEX "investment_packages_status_idx" RENAME TO "investment_plans_status_idx";

ALTER TABLE "package_versions" RENAME TO "plan_versions";
ALTER TABLE "plan_versions" RENAME COLUMN "package_id" TO "plan_id";
ALTER TABLE "plan_versions" RENAME COLUMN "lot_price" TO "slot_price";
ALTER INDEX "package_versions_package_id_idx" RENAME TO "plan_versions_plan_id_idx";
ALTER TABLE "plan_versions" RENAME CONSTRAINT "package_versions_package_id_investment_packages_id_fk" TO "plan_versions_plan_id_investment_plans_id_fk";

ALTER TABLE "investment_lots" RENAME TO "investment_slots";
ALTER TABLE "investment_slots" RENAME COLUMN "package_id" TO "plan_id";
ALTER TABLE "investment_slots" RENAME COLUMN "lot_count" TO "slot_count";
ALTER TABLE "investment_slots" RENAME COLUMN "price_per_lot" TO "price_per_slot";
ALTER INDEX "investment_lots_investment_id_idx" RENAME TO "investment_slots_investment_id_idx";
ALTER INDEX "investment_lots_package_id_idx" RENAME TO "investment_slots_plan_id_idx";
ALTER TABLE "investment_slots" RENAME CONSTRAINT "investment_lots_investment_id_investments_id_fk" TO "investment_slots_investment_id_investments_id_fk";
ALTER TABLE "investment_slots" RENAME CONSTRAINT "investment_lots_package_id_investment_packages_id_fk" TO "investment_slots_plan_id_investment_plans_id_fk";

ALTER TABLE "investments" RENAME COLUMN "package_id" TO "plan_id";
ALTER TABLE "investments" RENAME COLUMN "package_version_id" TO "plan_version_id";
ALTER TABLE "investments" RENAME COLUMN "lot_count" TO "slot_count";
ALTER INDEX "investments_package_id_idx" RENAME TO "investments_plan_id_idx";
ALTER TABLE "investments" RENAME CONSTRAINT "investments_package_id_investment_packages_id_fk" TO "investments_plan_id_investment_plans_id_fk";
ALTER TABLE "investments" RENAME CONSTRAINT "investments_package_version_id_package_versions_id_fk" TO "investments_plan_version_id_plan_versions_id_fk";

DROP TABLE IF EXISTS "project_documents";
DROP TABLE IF EXISTS "projects";
```

Drizzle tables: `investmentPlans`, `planVersions`, `investmentSlots`. Columns: `slotPrice`, `totalSlots`, `reservedSlots`, `soldSlots`, `minimumSlots`, `maximumSlots`, `planId`, `planVersionId`, `slotCount`, `pricePerSlot`. No `projectId`.

Relations: drop `projectsRelations` / `projectDocumentsRelations`. `investmentPlansRelations` has `versions`, `investments`, `slots` only. `investmentsRelations.plan` / `.planVersion`.

- [ ] **Step 1:** Write schema TS files; update index + relations + investments.
- [ ] **Step 2:** Add SQL + journal entry. Prefer generating snapshot via drizzle-kit after schema matches.
- [ ] **Step 3:** `pnpm --filter @solar/database build` (tsc --noEmit) PASS.
- [ ] **Step 4:** Commit `feat(db): rename packages to plans and drop projects`

---

### Task 4: Admin plan service

**Files:**
- Create: `apps/web/src/services/admin-plan-service.ts`
- Create: `apps/web/src/services/admin-plan-service.test.ts`
- Delete: `admin-package-service.ts`, `admin-package-service.test.ts`, `admin-project-service.ts`, `admin-project-service.test.ts`

**Interfaces:**
- `PlanInput` — same as `PackageInput` minus `projectId`; `lot*` → `slot*` (`slotPrice`, `totalSlots`, `availableSlots`, `minimumSlots`, `maximumSlots`)
- `availableSlots({ totalSlots, reservedSlots, soldSlots })`
- `deriveInventoryStatus` unchanged
- `validatePlanInput(input: PlanInput)` — banner required; no projectId
- Permissions: `plans.create|update|activate|pause`
- Exports: `createPlan`, `updatePlan`, `getPlan`, `listPlans`, `activatePlan`, `pausePlan`, `closePlan`, `archivePlan` (renames of the package functions)

- [ ] **Step 1:** Port tests to `availableSlots` / `validatePlanInput` without `projectId`. FAIL then implement.
- [ ] **Step 2:** Port service; use `investmentPlans` / `planVersions`.
- [ ] **Step 3:** Commit `feat: admin plan service without projects`

---

### Task 5: Marketplace, purchase, reinvest JSON

**Files:**
- Modify: `apps/web/src/services/marketplace-service.ts` (+ test)
- Modify: `apps/web/src/services/purchase-service.ts`, `reinvest-service.ts`
- Create: `apps/web/src/lib/plan-window.ts` (`isPlanWithinWindow`)
- Delete: `package-window.ts`

**Interfaces:**
- `quoteInvestment({ slotCount, slotPrice, returnRate, durationDays, now? })` returns `slotCount`, `slotPrice`, `principal`, `expectedReturn`, `maturityValue`, `durationDays`, `startAt`, `maturityAt`. `startAt` = `now`.
- `publicView(plan, version)` — **no** `projectId`/`projectName`/`packageName`. Fields: `id`, `name`, `planName` (same as `name`), `slotPrice`, `minimumSlots`, `maximumSlots`, `availableSlots`, `totalSlots`, `expectedRoiPerSlot`, plus existing status/banner/task fields.
- `purchasePlan` (rename `purchasePackage`) takes `planId`.
- Error strings: `"Invalid slot price."`

- [ ] **Step 1:** Update `marketplace-service.test.ts` to `slotCount`/`slotPrice`. FAIL, then implement quote + publicView.
- [ ] **Step 2:** Update purchase/reinvest to `planId` / `investmentPlans` / `slotCount`. Keep startAt = quote now.
- [ ] **Step 3:** Commit `feat: plan marketplace JSON without projectName`

---

### Task 6: Other services drop project join

**Files:** `portfolio-service.ts`, `returns-service.ts`, `task-service.ts`, `admin-investments-service.ts`, `admin-returns-service.ts`, `admin-maturity-service.ts`, `admin-dashboard-service.ts`, `admin-reports-service.ts`, `admin-reinvestments-service.ts`, plus their tests.

**Rule:** innerJoin `investmentPlans` only. Map `planName: investmentPlans.name`, `planId: investmentPlans.id`. Remove `projectName`. Admin dashboard “open packages” label becomes open plans count (same query on `investmentPlans.status = OPEN`).

- [ ] **Step 1:** Typecheck/tests will fail after Task 3; fix every `investmentPackages` / `projects` import.
- [ ] **Step 2:** `pnpm --filter @solar/web exec vitest run` for touched unit tests PASS.
- [ ] **Step 3:** Commit `feat: drop project joins from portfolio and admin services`

---

### Task 7: HTTP routes

**Create**
- `apps/web/app/api/admin/plans/route.ts`
- `apps/web/app/api/admin/plans/[id]/route.ts`
- `apps/web/app/api/admin/plans/[id]/{activate,pause,close,archive}/route.ts`
- `apps/web/app/api/plans/route.ts`
- `apps/web/app/api/plans/[id]/route.ts`
- `apps/web/app/api/plans/[id]/quote/route.ts`
- `apps/web/app/api/plans/[id]/purchase/route.ts`

**Delete** all of `api/admin/packages`, `api/admin/projects`, `api/marketplace`.

Wire handlers to Task 4–5 functions. Media upload permission: `plans.create` or `plans.update`.

- [ ] **Step 1:** Move/adapt route files (keep request/response shapes, new names).
- [ ] **Step 2:** Commit `feat: plan APIs; remove package and project routes`

---

### Task 8: Admin UI `/admin/plans`

**Files:**
- Create `apps/web/app/admin/plans/{page,new/page,[id]/page}.tsx` from current packages pages
- Modify `admin-nav.tsx`: remove Projects; Packages → `{ href: "/admin/plans", label: "Investment plans", permissions: ["plans.create","plans.update","plans.activate","plans.pause"] }`
- Sidebar icon: keep existing packages icon on `/admin/plans`
- Rename `package-funding.tsx` → `plan-funding.tsx` using `planFunding` / slot labels (Expected / Invested / Remaining / Expected ROI)
- Copy: slot, plan — never lot/package/project
- Delete `admin/packages/**`, `admin/projects/**`
- Dashboard copy “Open packages” → “Open plans”

- [ ] **Step 1:** Port pages; remove project picker from new/edit.
- [ ] **Step 2:** Commit `feat(admin): investment plans UI`

---

### Task 9: Flutter investor app

**Files:**
- Modify marketplace, portfolio, maturity, reinvest screens under `apps/mobile/lib/`
- Rename `package_detail_screen.dart` → `plan_detail_screen.dart`; update `main.dart` imports
- API: `GET /api/plans`, `GET /api/plans/:id`, `GET /api/plans/:id/quote`, `POST /api/plans/:id/purchase`
- JSON: `planName` (fallback `name`), `slotPrice`, `availableSlots`, `expectedRoiPerSlot`
- UI: investment/plan **name** + metadata only. No `Project:` line.

- [ ] **Step 1:** Update API paths and field names.
- [ ] **Step 2:** `dart analyze` in `apps/mobile` (or flutter analyze) — no errors in touched files.
- [ ] **Step 3:** Commit `feat(mobile): consume plan APIs`

---

### Task 10: Remove investor website

**Files:**
- Delete `apps/web/app/(investor)/**`
- Delete `apps/web/app/(auth)/**`
- Modify `apps/web/app/page.tsx` to `redirect("/admin/login")` from `next/navigation`
- `auth-form.tsx` may remain unused — delete if nothing imports it
- Update e2e: `apps/web/src/e2e/daily-tasks.test.ts`, `investor-lifecycle.test.ts`, `admin-lifecycle.test.ts` — `createProject` gone; `createPlan` without project; `purchasePlan`

- [ ] **Step 1:** Delete investor/auth pages; home redirects.
- [ ] **Step 2:** Fix e2e helpers to create/open a plan then purchase.
- [ ] **Step 3:** Commit `feat(web): admin-only site; remove investor pages`

---

### Task 11: Notification copy + grep gate

**Files:** `database/seed/notification-templates.ts` and remaining product code.

- Templates: `{{packageName}}` → `{{planName}}`; “new package” → “new plan”
- Run from repo root:

```bash
rg -n "projectName|packageName|availableLots|lotPrice|/admin/packages|/admin/projects|/api/marketplace/packages|packages\.create|projects\.create" \
  --glob '!docs/superpowers/**' --glob '!**/migrations/meta/**' --glob '!**/0016_*'
```

Expected: no matches in app/database/seed (except historical comments if any — fix them).

- [ ] **Step 1:** Fix leftovers until grep is clean.
- [ ] **Step 2:** `pnpm --filter @solar/database test` and `pnpm --filter @solar/web test` PASS (skip e2e if DB down).
- [ ] **Step 3:** Commit `chore: grep-clean package and project identifiers`

---

## Spec coverage

| Spec section | Task |
|---|---|
| Surfaces / names | 8, 9, 10 |
| Staff `/admin/plans` | 8 |
| Mobile marketplace | 9 |
| Drop projects tables | 3 |
| Rename packages→plans schema | 3 |
| JSON `planName` | 5, 6 |
| Admin/investor APIs | 7 |
| Permissions `plans.*` | 2 |
| 404 old URLs | 7, 10 |
| `/` → admin login | 10 |
| Testing | 1, 2, 4, 5, 11 |
| startAt = purchase now | 5 (unchanged behavior) |
