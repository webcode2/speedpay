# Chunk 05 — Payout Accounts Design

**Date:** 2026-09-20  
**Status:** Approved for implementation planning (pending user review of this doc)  
**Product:** Solar Investment Platform  
**Depends on:** Chunks 01–04 (auth, KYC, admin sessions, RBAC, audit)  
**Scope:** Investor payout/bank accounts (Flutter + APIs), admin review queue (web). No investor web UI. No bank name enquiry. No withdrawals or withdrawal PIN.

---

## 1. Goal

KYC-approved investors can add, edit, remove, and set a default bank payout account from Flutter. New and re-edited accounts require staff approval before status is `VERIFIED`. Staff review a dedicated admin queue with permission checks and audit logs.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Account verification | Admin review (`PENDING` → `VERIFIED` \| `REJECTED`) |
| Who may add accounts | Only `users.status === KYC_APPROVED` |
| Investor clients | Flutter only (no new investor web pages) |
| Staff clients | Admin web (`/admin/payouts`) |
| Bank lookup / Paystack | Out of scope — free-text bank fields |
| Withdrawals / PIN | Chunk 16 |
| Edit of verified account | Resets status to `PENDING` and clears review fields |
| Delete | Soft-delete via `deleted_at` |

---

## 3. Schema

### 3.1 Enum `payout_account_status`

```text
PENDING
VERIFIED
REJECTED
```

### 3.2 Table `payout_accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `bank_name` | text | Required |
| `account_number` | text | Required; store full value server-side |
| `account_name` | text | Required |
| `is_default` | boolean | Default false |
| `status` | enum | Default `PENDING` |
| `rejection_reason` | text nullable | Set on reject |
| `reviewed_at` | timestamptz nullable | |
| `reviewed_by` | uuid nullable FK → admins | |
| `deleted_at` | timestamptz nullable | Soft-delete |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Indexes / constraints**

- Index on `(user_id)` where `deleted_at` is null
- Index on `(status)` for admin queue (non-deleted)
- Application-enforced: at most one row with `is_default = true` and `deleted_at` is null per user (transactional clear-others on set-default)

### 3.3 Permissions (seed catalog)

Add and assign to `SUPER_ADMIN` for Chunk 05 (other roles can gain these permissions in later RBAC chunks):

- `payouts.read`
- `payouts.approve`
- `payouts.reject`

---

## 4. Domain rules

1. **KYC gate:** `POST /api/payout-accounts` requires `KYC_APPROVED`; otherwise `KYC_REQUIRED`.
2. **Create:** status `PENDING`; if user has no other non-deleted accounts, set `is_default = true`.
3. **Edit:** owner only; if previous status was `VERIFIED`, set `PENDING`, clear `reviewed_at` / `reviewed_by` / `rejection_reason`.
4. **Set default:** owner only; clear `is_default` on other non-deleted rows in same transaction; audit.
5. **Remove:** soft-delete; if deleted row was default, leave user with no default (they must set another) or auto-promote another verified account if present — **choose: clear default only** (simplest; client prompts set-default).
6. **Approve:** admin + `payouts.approve`; only from `PENDING` → `VERIFIED`; audit.
7. **Reject:** admin + `payouts.reject`; only from `PENDING` → `REJECTED` with non-empty `reason`; audit.
8. **List responses:** mask `account_number` to last 4 characters for investor and admin list views; full number only on detail if needed for staff review (admin detail may show full number).

---

## 5. APIs

Envelope unchanged: `{ success, data }` / `{ success: false, error }`.

### 5.1 Investor (user session)

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/payout-accounts` | Own non-deleted accounts |
| POST | `/api/payout-accounts` | Create |
| PATCH | `/api/payout-accounts/[id]` | Update fields |
| POST | `/api/payout-accounts/[id]/default` | Set default |
| DELETE | `/api/payout-accounts/[id]` | Soft-delete |

### 5.2 Admin (admin session)

| Method | Path | Permission |
|---|---|---|
| GET | `/api/admin/payouts` | `payouts.read` — query `status` (default `PENDING`) |
| GET | `/api/admin/payouts/[id]` | `payouts.read` |
| POST | `/api/admin/payouts/[id]/approve` | `payouts.approve` |
| POST | `/api/admin/payouts/[id]/reject` | `payouts.reject` — body `{ reason }` |

### 5.3 Error codes

Reuse existing where possible; add:

- `KYC_REQUIRED`
- `INVALID_STATE` (illegal status transition)
- `NOT_FOUND`, `FORBIDDEN`, `UNAUTHORIZED`, `VALIDATION_ERROR`

---

## 6. UIs

### 6.1 Flutter (investor)

- Payout accounts list (status badge, default indicator, masked number)
- Add / edit form (`bank_name`, `account_number`, `account_name`)
- Actions: set default, remove
- Entry from home/profile
- Surface rejection reason when `REJECTED`

### 6.2 Admin web

- `/admin/payouts` — filterable queue
- `/admin/payouts/[id]` — full account + user summary; Approve / Reject
- Link from existing admin nav / KYC area as appropriate

### 6.3 Explicitly not built

- Investor Next.js `/payout-accounts` page
- Bank code catalogues / name enquiry
- Withdrawal flows

---

## 7. Services & layering

Mirror Chunk 04 patterns:

- `payout-account-service.ts` — investor operations
- `admin-payout-service.ts` — queue + approve/reject
- Zod validators for create/update/reject
- Permission checks via existing `permissions/check`
- Audit via existing audit helper used by KYC

---

## 8. Testing & DoD

**Tests**

- KYC gate on create
- First account becomes default
- Set-default exclusivity
- Verified edit → `PENDING`
- Soft-delete hides from list
- Approve/reject only from `PENDING`
- Permission denial for admin without `payouts.*`

**DoD checklist**

- [ ] Migration for `payout_accounts` + enum
- [ ] Seed permissions updated
- [ ] Investor APIs wired
- [ ] Admin APIs + pages
- [ ] Flutter screens + routes
- [ ] README notes (Flutter-only investors for payouts; admin review)
- [ ] Web tests/build pass; `flutter analyze` clean of new issues
- [ ] No withdrawal/PIN/bank API
- [ ] Migrate deferred if Postgres unavailable

---

## 9. Out of scope

- Investor web portal pages (product: mobile-only investors)
- Payment provider bank verification
- Withdrawals, withdrawal PIN, deposits, wallet
- Projects / packages (Chunks 06+)
