# Admin Settings, Full-Width Layout, Platform Payment Accounts & Package Banner

**Date:** 2026-09-20  
**Status:** Approved — ready for implementation plan  
**Product:** Solar Investment Platform (SPEED PAY admin)  
**Depends on:** Existing admin shell, `system_settings`, packages CRUD, deposit mock provider, object storage  
**Scope:** Admin UI layout + settings UX; platform payment accounts for investor deposits; package form layout + required banner; restyle remaining dark admin forms to brand tokens. No Flutter UI redesign beyond consuming deposit instructions if payload shape changes.

---

## 1. Goal

1. Admin pages use the full main content area (no narrow `max-w-*` columns).
2. Settings are view-only by default, grouped into cards of related keys, with independent per-card edit.
3. Admins manage any number of platform alternate payment accounts (bank / mobile money / other), publish or disable each, and investors receive a **random published** account on every deposit create/instruction request.
4. Package create/edit forms are two-column, require a banner image, and use SPEED PAY light form chrome (not dark slate).

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Approach | First-class entities (table + CRUD), not JSON in settings |
| Randomization | Fresh uniform random among `PUBLISHED` accounts on every deposit create / instruction fetch (option A) |
| Account shape | Flexible type: `BANK` \| `MOBILE_MONEY` \| `OTHER` (option B) |
| Admin home for accounts | Dedicated `/admin/payment-accounts` under Operations (option A) |
| Settings cards | One card per existing catalog group; similar keys stay on the same card; each card edits independently |
| Settings default mode | View-only; form inputs only after Edit on that card |
| Layout | Remove page-level `max-w-*` on admin list/detail/settings/forms |
| Package banner | Required storage key on package; upload via object storage |
| Form chrome | Replace remaining dark `bg-slate-900` / `border-slate-600` admin forms with shared light `AdminInput` / brand tokens |

---

## 3. Layout & form chrome

### 3.1 Full-width pages

- Remove `mx-auto max-w-*` wrappers from admin pages (dashboard, lists, settings, package/project forms, detail pages under `apps/web/app/admin/**`).
- Keep shell padding (`p-6`) and sidebar; content spans the remaining viewport width.
- Tables/cards may still use internal max widths only where readability requires (optional, prefer full width).

### 3.2 Brand form styling

- Shared controls already in `apps/web/app/admin/_components/ui.tsx` (`AdminInput`, `AdminSelect`, `AdminCard`).
- Migrate package (and any remaining dark) admin forms to those controls + CSS variables (`--sp-navy`, `--sp-lime`, `--sp-border`, `--sp-surface`, white backgrounds).
- No new dark-mode form skins in admin.

---

## 4. Settings UI

### 4.1 Structure

- Route: `/admin/settings` (unchanged).
- Two-column responsive grid of **group cards**, one per catalog group:
  - `app`, `investment`, `deposit`, `withdrawal`, `returns`, `security`, `notification`
- Keys within a group always render on that same card (no splitting related keys across cards).

### 4.2 View / edit behavior

- Default: each card shows key labels + current values (read-only text).
- **Edit** (requires `settings.update`): that card enters edit mode with inputs; other cards remain view-only.
- **Save**: `PATCH /api/admin/settings` with `updates` containing **only dirty keys from that group**.
- **Cancel**: discard local draft for that card; return to view mode.
- If user lacks `settings.update`, omit Edit buttons (view-only forever).

### 4.3 API

- Existing `GET` / `PATCH` on `/api/admin/settings` are sufficient (no schema change to `system_settings`).
- No new endpoints required for settings grouping (group comes from catalog).

---

## 5. Platform payment accounts

### 5.1 Table `platform_payment_accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `type` | enum | `BANK`, `MOBILE_MONEY`, `OTHER` |
| `label` | text | Admin nickname (not necessarily shown to investor) |
| `account_name` | text | Beneficiary / holder name shown to investor |
| `account_number` | text | Account or wallet number |
| `bank_name` | text nullable | Bank name when type is BANK |
| `provider` | text nullable | Mobile network / provider when MOBILE_MONEY (or OTHER) |
| `notes` | text nullable | Extra instructions for investor |
| `status` | enum | `PUBLISHED` \| `DISABLED` |
| `created_at` / `updated_at` | timestamptz | |

No soft-delete column in v1: **Disable** removes from rotation; admin may hard-delete if desired via DELETE (optional; if implemented, only when `DISABLED`).

### 5.2 Admin API & UI

- Nav: Operations → **Payment accounts** → `/admin/payment-accounts`
- Permissions (reuse or add under deposit/settings ops): prefer new `payment_accounts.read` / `payment_accounts.write` seeded for Super Admin; if catalog churn is heavy, temporarily gate with `settings.update` + `deposits.read` — **prefer dedicated permissions**.
- Endpoints:
  - `GET /api/admin/payment-accounts` — list
  - `POST /api/admin/payment-accounts` — create (`status` default `DISABLED` until Publish)
  - `GET/PATCH /api/admin/payment-accounts/[id]` — detail / update fields
  - `POST /api/admin/payment-accounts/[id]/publish`
  - `POST /api/admin/payment-accounts/[id]/disable`
  - Optional `DELETE /api/admin/payment-accounts/[id]` when `DISABLED`
- UI: full-width table + create/edit form (2-column), status pills, Publish/Disable actions.
- Audit: `PAYMENT_ACCOUNT_CREATED|UPDATED|PUBLISHED|DISABLED|DELETED`.

### 5.3 Investor deposit integration

- On deposit create (mock provider path), select one account:

```
published = all where status = PUBLISHED
if published.length == 0 → fail with clear error (cannot accept deposits without a published account)
else → account = published[randomIndex]
```

- Payment payload `instructions` (and structured fields if easy) include type, account name, number, bank/provider, notes.
- Randomize **every** create/instruction request (not sticky per user).
- Investor list of all platform accounts is **not** exposed; only the chosen account appears on the deposit response.

### 5.4 Mobile / web investor clients

- Continue displaying `payment.instructions` string; ensure string is human-readable from selected account.
- Optional structured `payment.account` object for future UI; not required for Flutter redesign in this scope if instructions string is complete.

---

## 6. Package form & banner

### 6.1 Schema

- Add `banner_image` text nullable on `investment_packages` (storage key).
- Application rule: **required** on create and must remain set on update (replace allowed). Migration may leave existing rows null; activate/create paths enforce non-null going forward — edit of legacy packages must upload a banner before save succeeds.

### 6.2 Upload

- Reuse `getStorage()` (`local` \| `r2`).
- Prefer: `POST /api/admin/packages/[id]/banner` multipart `file` after package exists, **or** create package then upload banner in same admin flow (create → redirect → upload, or create with two-step client).
- Recommended UX: on **new** package, allow selecting file client-side; `POST` package JSON first (if banner required at DB level, either make column nullable until upload completes in one transaction flow, or upload to temp key then set on create).
- **Locked UX:** Two-step on create — (1) create package metadata with temporary allowance OR create with banner via multipart create endpoint. Prefer **multipart-capable create** or **create then immediate banner upload before leaving page**, blocking “done” until banner exists.
- Simplest consistent path: `bannerImage` nullable in DB; API create/update validators require non-empty `bannerImage`; new page uploads file to storage first (or via a small upload endpoint that returns `storageKey`), then includes key in POST body.

### 6.3 Form layout

- Full-width 2-column:
  - **Left:** project, name, description, banner upload + preview
  - **Right:** lot price, total/min/max lots, return type, return rate, duration
- Light brand inputs only.

### 6.4 Versions

- Package versions snapshot pricing/terms; banner lives on the package row (not versioned) unless versions already copy media — keep banner on package only for v1.

---

## 7. Permissions & RBAC seed

Add (or map) permissions:

| Permission | Use |
|---|---|
| `payment_accounts.read` | List/detail admin |
| `payment_accounts.write` | Create/update/publish/disable/delete |

Assign to Super Admin role in seed. Nav link filtered by `payment_accounts.read`.

---

## 8. Error handling

| Case | Behavior |
|---|---|
| No published payment accounts | Deposit create returns 4xx with message that funding accounts are unavailable |
| Settings save empty group | No-op message “No changes” |
| Package save without banner | 400 validation error |
| Upload too large / bad type | 400; allow common image MIME types (jpeg/png/webp) |

---

## 9. Testing

- Settings: view mode has no inputs; edit one group does not dirty another; PATCH only that group’s keys.
- Payment accounts: publish/disable toggles rotation membership; with 2+ published, repeated deposit creates eventually use both (statistical or mocked RNG).
- With zero published, deposit create fails clearly.
- Package create without banner fails; with banner succeeds; admin form is two-column and light-themed.
- Admin pages render without `max-w-*` constraint on main wrappers.

---

## 10. Out of scope

- Sticky per-user or per-deposit account assignment
- Investor Flutter redesign beyond reading updated instructions
- Public directory of all platform accounts
- Changing `system_settings` catalog keys
- Hardening payment matching / auto-reconciliation against account numbers

---

## 11. Implementation order

1. Full-width + form chrome migration (packages + remaining dark forms)
2. Settings view/edit per group cards (2-column)
3. Schema + admin CRUD for `platform_payment_accounts` + nav
4. Wire deposit provider to random published account
5. Package `banner_image` + upload + two-column form validation
