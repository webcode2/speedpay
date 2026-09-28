# Investment Plans (drop Project and Package)

**Date:** 2026-09-28  
**Status:** Approved — ready for implementation plan  
**Product:** SPEED PAY  
**Supersedes (product, not git history):** Chunk 06 Projects, Chunk 07 Packages (as a named feature), Chunk 08 marketplace **web UI**, Chunk 26 Investor web  
**Keeps:** Slot inventory math, purchase, wallet, KYC, deposits, withdrawals, returns, maturity, reinvest, daily-task quota/reward on the offer  
**Clients:** Staff admin on the website. Investors on the Flutter mobile app only.

---

## 1. Goal

Staff create **investment plans** with a slot price and a slot count. Investors in the mobile app buy slots on those plans. There is no Project entity and no Package feature. The website is admin-only.

---

## 2. Decisions locked

| Decision | Choice |
|---|---|
| Surfaces | Web (Next.js) = `/admin` only. Investors = Flutter app (`apps/mobile`), including if that app is run as Flutter web. Not a Next.js `/app` route. |
| Offer name | Investment plan |
| Unit name (staff + mobile) | Slot. Never package, project, or lot in UI copy. |
| Mechanics | Same as today’s packages: slot price, total/reserved/sold slots, min/max per person, ROI type/rate, duration, draft → open → pause/full/close/archive |
| Start date | When the investor buys, not when the plan fills |
| Tracking on mobile | Investment **name** + metadata (status, dates, amounts, slots). No project subtitle. |
| Rename depth | Full build: routes, APIs, permissions, schema, Flutter screens, types. Not labels-only. |
| IDs | PostgreSQL `RENAME` so existing investment rows keep the same offer id |
| Investor website | Delete `(investor)` and `(auth)` pages. `/` redirects to admin login. Investor `/api/auth/*` stays for the mobile app. |
| Old URLs | `/admin/projects`, `/admin/packages`, `/api/admin/projects*`, `/api/admin/packages*`, `/api/marketplace/packages*`, investor pages → **404** |
| Out of scope | Ledger reservation algorithm, payout formula, daily-task review rules (only the offer they hang off is renamed) |

---

## 3. Surfaces

### 3.1 Staff (website)

- Nav: remove **Projects**. Replace **Packages** with **Investment plans**.
- Routes: `/admin/plans`, `/admin/plans/new`, `/admin/plans/[id]`.
- Create is one form: name, description, banner, slot price, total slots, min/max per person, return type, return rate, duration days, optional available-from/until, daily-task limit/reward. Save draft, then open. **No project picker.**
- List/detail: expected / invested / remaining / expected ROI (same funding strip as today). Open plans default to compact view with an edit control.
- Permission gate on media upload: `plans.create` / `plans.update`.

### 3.2 Investors (mobile app)

- Marketplace lists **open plans**: name, slot price, expected ROI per slot, slots left.
- Detail: buy N slots from wallet. Same purchase path, new plan endpoints.
- Portfolio, returns, maturity, reinvest: **plan name** (the investment’s offer name) plus tracking metadata. No `Project:` line.
- File/route names in Flutter follow plan/slot (e.g. plan detail, not package detail).

### 3.3 Website investor UI (removed)

Delete:

- `apps/web/app/(investor)/**`
- `apps/web/app/(auth)/**` (investor login/register/password pages)

Keep:

- `apps/web/app/admin/**` including `/admin/login`
- Investor JSON APIs under `/api/*` (auth, wallet, plans, purchase, etc.) for the mobile app

`/` redirects to `/admin/login`. Home copy must not mention an investor portal.

---

## 4. Data

One migration using `ALTER … RENAME` so money rows keep working.

### 4.1 Drop

- Tables `projects`, `project_documents`
- `investment_plans.project_id` (today `investment_packages.project_id`) and its index
- Permission codes `projects.create`, `projects.update`, `projects.publish`
- Admin project services, pages, and APIs

### 4.2 Rename offer

| Today | After |
|---|---|
| Table `investment_packages` | `investment_plans` |
| Table `package_versions` | `plan_versions` |
| Table `investment_lots` | `investment_slots` |
| Columns `package_id`, `package_version_id` | `plan_id`, `plan_version_id` |
| `lot_price`, `total_lots`, `reserved_lots`, `sold_lots`, `minimum_lots`, `maximum_lots`, `lot_count`, `price_per_lot` | `slot_price`, `total_slots`, `reserved_slots`, `sold_slots`, `minimum_slots`, `maximum_slots`, `slot_count`, `price_per_slot` |
| Drizzle `investmentPackages`, `packageVersions`, `investmentLots` | `investmentPlans`, `planVersions`, `investmentSlots` |
| Helper `packageFunding` | `planFunding` (`slotPrice`, `totalSlots`, `soldSlots`, `roiPerSlot`) |

Statuses stay: `DRAFT`, `OPEN`, `PAUSED`, `FULL`, `CLOSED`, `ARCHIVED`.  
`daily_task_limit` and `task_reward` stay on the plan. Quota still uses the investor’s best **ACTIVE** plan.

Seed catalog: existing sample offers become plans with no project parent. Location/capacity/documents are not migrated onto the plan (they belonged to Project and are dropped).

### 4.3 JSON (mobile + admin)

- Drop `projectName`, `packageName`, `packageId`.
- Use `planName`, `planId`, `slotPrice`, `totalSlots`, `soldSlots`, `expectedRoiPerSlot`, and existing investment fields (`status`, `startAt`, `maturityAt`, principal, slot count).
- Error messages say plan/slots (`NOT_FOUND` for unknown plan, `INSUFFICIENT_BALANCE`, `KYC_REQUIRED`, `INVALID_STATE` unchanged as codes).

---

## 5. APIs and permissions

### 5.1 Admin

| Today | After |
|---|---|
| `/api/admin/packages` | `/api/admin/plans` |
| `/api/admin/packages/[id]` + activate/pause/close/archive | `/api/admin/plans/[id]` + same actions |
| `/api/admin/projects*` | deleted |

Permissions: `plans.create`, `plans.update`, `plans.activate`, `plans.pause`.  
Roles that had `packages.*` get the matching `plans.*`. `packages.*` and `projects.*` are removed from the catalog. Super-admin seed updated.

### 5.2 Investor (mobile)

| Today | After |
|---|---|
| `/api/marketplace/packages` | `/api/plans` |
| `/api/marketplace/packages/[id]` | `/api/plans/[id]` |
| `/api/marketplace/packages/[id]/quote` | `/api/plans/[id]/quote` |
| `/api/marketplace/packages/[id]/purchase` | `/api/plans/[id]/purchase` |

Purchase/reinvest services take `planId`. Behavior unchanged: quote `startAt = now`; filling the plan sets status `FULL` and does not delay start.

### 5.3 Redirects

Do not alias old package/project paths. Clients must call the new paths. Old paths 404.

---

## 6. Failures

- Admin create/update: validation on price, slot counts, ROI, duration. No “project required” check.
- Investor buy: same wallet/KYC/available-slot checks; copy refers to the plan.
- Missing plan id → `NOT_FOUND`.
- Staff without `plans.*` → `FORBIDDEN` on plan routes.

---

## 7. Testing

- Unit: `planFunding` (expected / invested / remaining / ROI) with no project id. Response mappers emit `planName` only.
- Admin: create plan, open it, list shows slots and ROI, no project field. Permission codes are `plans.*`.
- Mobile: marketplace and detail use `/api/plans`. Purchase still succeeds. Portfolio/maturity show name + metadata only.
- Web: `/` → `/admin/login`. Investor page routes 404. `/api/packages` and `/api/admin/projects` 404.
- Existing purchase, wallet, KYC, maturity, and daily-task tests updated for plan/slot names and still pass.

---

## 8. Implementation slices (for the plan, not extra specs)

1. Schema rename + drop projects; Drizzle + seed + permission catalog.  
2. Services and `/api/admin/plans` + `/api/plans`; delete package/project routes.  
3. Admin UI `/admin/plans`; remove project/package pages and nav.  
4. Flutter copy, routes, and API client.  
5. Delete investor website pages; `/` → admin login.  
6. Grep-clean remaining `package`/`project` product identifiers in app code (historical specs under `docs/superpowers/specs/2026-09-20-*` stay as archive).

---

## 9. Out of scope

- Changing how slots are reserved in the ledger  
- ROI payout formula  
- Daily-task item CRUD or review UX  
- Admin dashboard redesign  
- Native store listing / app rename beyond in-app copy  
