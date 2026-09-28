# Daily Review Tasks

**Date:** 2026-09-28  
**Status:** Approved — ready for implementation plan  
**Product:** Solar Investment Platform (SPEED PAY)  
**Depends on:** Investment packages, investments (`ACTIVE`), wallets + ledger (`AVAILABLE`), wallet transactions, notifications, admin RBAC + permission catalog, admin media upload (`/api/admin/media/image`), Flutter app shell  
**Scope:** Admin-managed review items; investors with an active investment complete a daily quota of reviews (stars + comment) and receive an instant fixed wallet reward per review. Quota and reward come from the investor's best active package.

---

## 1. Goal

Give investors a daily engagement loop: review listed items (hotel-style cards with image, title, category) and earn a fixed reward per review, credited instantly to their wallet. Admins control the item catalog and, per package, how many tasks per day and how much each pays.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Task kind | Review listed items: open item, give 1–5 stars + short comment, submit |
| Reward | Instant fixed credit to wallet `AVAILABLE` on each successful submission |
| Quota source | Per-package fields `daily_task_limit` + `task_reward` |
| Multiple investments | Use the single best `ACTIVE` package (highest limit; tie → higher reward). Limits do **not** add up |
| Eligibility | Only users with at least one `ACTIVE` investment whose best package limit > 0 |
| Day boundary | UTC midnight |
| Repeat rule | Each item at most once per user per UTC day |
| Enforcement | Server-side only (quota, eligibility, duplicates); client never trusted |
| Admin approval of reviews | None in v1 |

---

## 3. Data model (one migration)

### 3.1 `investment_packages` (alter)

| Column | Type | Default | Notes |
|---|---|---|---|
| `daily_task_limit` | integer not null | `0` | `0` = package grants no tasks |
| `task_reward` | bigint not null | `0` | Same money units as `principal` / ledger amounts |

Validation (admin package create/update): both ≥ 0 integers.

### 3.2 `task_items` (new)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `title` | text not null | |
| `category` | text not null | Suggested: Luxury, Resort, City, Boutique, Budget, Deals; free text allowed |
| `description` | text not null | |
| `image_key` | text not null | Storage key from admin media upload |
| `status` | text not null default `DISABLED` | `PUBLISHED` \| `DISABLED` |
| `sort_order` | integer not null default 0 | Ascending in lists |
| `created_at`, `updated_at` | timestamptz | |

Index on `(status, sort_order)`.

### 3.3 `task_completions` (new)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk users | |
| `task_item_id` | uuid fk task_items (restrict) | |
| `stars` | integer not null | 1–5 |
| `comment` | text not null | Trimmed, min 10 chars, max 500 |
| `reward_amount` | bigint not null | Snapshot of reward at submission time |
| `task_date` | date not null | UTC date of submission |
| `wallet_transaction_id` | uuid fk wallet_transactions | |
| `created_at` | timestamptz | |

Unique index `(user_id, task_item_id, task_date)` — makes double submits impossible.  
Index `(user_id, task_date)` for quota counts.

---

## 4. Allowance rules (server)

Pure helper (unit-tested):

```ts
resolveTaskAllowance(activePackages: { dailyTaskLimit: number; taskReward: number }[])
  → { eligible: boolean; dailyLimit: number; rewardPerTask: number; reason?: "NO_ACTIVE_INVESTMENT" | "NO_TASKS_FOR_PACKAGE" }
```

1. No `ACTIVE` investments → `eligible: false`, reason `NO_ACTIVE_INVESTMENT`.
2. Pick package with highest `dailyTaskLimit`; tie → highest `taskReward`.
3. Best `dailyTaskLimit` = 0 → `eligible: false`, reason `NO_TASKS_FOR_PACKAGE`.
4. `remaining = max(0, dailyLimit − completionsToday)`.

---

## 5. Submit flow (single DB transaction)

`completeTask({ userId, taskItemId, stars, comment })`:

1. Validate input (stars 1–5 integer; comment trimmed 10–500 chars) → `VALIDATION_ERROR` 400.
2. Lock the user's wallet row (`FOR UPDATE`) to serialize concurrent submits for that user.
3. Recompute allowance from `ACTIVE` investments → not eligible: `FORBIDDEN` 403 with reason.
4. Count today's completions (UTC) → `remaining <= 0`: `TASK_LIMIT_REACHED` 409.
5. Load item → missing or not `PUBLISHED`: `NOT_FOUND` 404.
6. Already completed this item today → `TASK_ALREADY_COMPLETED` 409 (also guaranteed by unique index; unique violation mapped to same error).
7. Insert wallet transaction (type `TASK_REWARD`, direction credit, amount = rewardPerTask, wallet currency) and `AVAILABLE` ledger entry (+amount), following existing ledger posting conventions.
8. Insert `task_completions` row with `reward_amount` snapshot and `wallet_transaction_id`.
9. After commit: create in-app notification “Task reward +{amount}” (non-blocking; failure does not undo reward).

Returns `{ completedToday, remaining, dailyLimit, rewardPerTask, earnedToday, availableBalance }`.

---

## 6. API

### 6.1 Investor (Bearer / cookie session, existing investor auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tasks/today?category=` | Allowance, counts, earned today, published items (optional category filter) each with `completedToday: boolean` |
| GET | `/api/tasks/items/:id` | Single published item detail + `completedToday` |
| POST | `/api/tasks/items/:id/complete` | Body `{ stars, comment }` → submit flow result |
| GET | `/api/tasks/history?limit=&cursor=` | User's completions newest first (item title/image, stars, reward, date) |

`/api/tasks/today` shape:

```ts
{
  eligible: boolean;
  reason?: "NO_ACTIVE_INVESTMENT" | "NO_TASKS_FOR_PACKAGE";
  dailyLimit: number;
  completedToday: number;
  remaining: number;
  rewardPerTask: number;
  earnedToday: number;
  currency: string;
  categories: string[];          // distinct categories of published items
  items: {
    id: string; title: string; category: string; description: string;
    imageUrl: string; completedToday: boolean;
  }[];
}
```

Items are returned even when not eligible (so the screen can preview), but submit is rejected.

### 6.2 Admin (new permissions `tasks.read`, `tasks.write`)

| Method | Path | Perm |
|---|---|---|
| GET | `/api/admin/tasks/items` | tasks.read |
| POST | `/api/admin/tasks/items` | tasks.write |
| GET | `/api/admin/tasks/items/:id` | tasks.read |
| PATCH | `/api/admin/tasks/items/:id` | tasks.write (fields + status publish/disable) |
| GET | `/api/admin/tasks/completions?userId=&date=&limit=&cursor=` | tasks.read |

Image upload reuses `/api/admin/media/image`. Mutations write audit log entries like other admin services. Permissions added to the seed catalog and granted to super-admin/operations roles consistent with existing catalog patterns.

Package admin create/update accepts and returns `dailyTaskLimit`, `taskReward`.

---

## 7. Admin web UI

- Sidebar: **Tasks** under Operations → `/admin/tasks` (items) and `/admin/tasks/completions`.
- Items page: card grid (image, title, category, status pill, completions today), filter by status, “New item” button.
- Item create/edit: two-column light brand form (`AdminCard`/`AdminInput`), required image upload, Publish/Disable action.
- Completions page: table (user email, item, stars, reward, date/time), filters by user and date.
- Package create/edit forms: new **Daily tasks** card with “Tasks per day” and “Reward per task”.

---

## 8. Mobile (Flutter)

- Route `/tasks`, entry from Home (Tasks tile/tab) — styled after the provided reference (card grid, category chips, list cards).
- Header card: “Today: {completed} / {limit} done · {earnedToday} earned”, reward per task.
- Category chips row (All + categories), item list cards (image, title, category, Review / Done state).
- Review bottom sheet: tappable 1–5 stars, comment field (10–500 chars), Submit → success snackbar “+{reward}” and refresh.
- Not eligible: empty state with message per reason and “Invest now” → `/marketplace`.
- Limit reached: header shows “All tasks done for today — come back tomorrow”; Review buttons disabled.
- Wallet transaction list already shows new `TASK_REWARD` transactions (label mapping added if needed).

---

## 9. Out of scope

- Streaks, bonuses, leaderboards
- Admin approval / moderation of reviews
- Per-item reward amounts
- Investor web portal Tasks page
- Timezone-per-user day boundaries

---

## 10. Testing

- **Unit:** `resolveTaskAllowance` (none active, limit 0, best-of-many, tie-break); remaining math; input validation.
- **Service integration (DB):** successful submit credits wallet once + ledger entry; duplicate same item same day rejected; over-limit rejected; no active investment rejected; disabled item rejected; concurrent double submit yields one credit.
- **E2E:** user invests in package with limit N → `/api/tasks/today` shows N → completes N tasks → balance increases by N × reward → N+1 rejected.

---

## 11. Acceptance

1. Admin can create, publish, disable task items with images.
2. Admin can set tasks/day and reward/task on a package.
3. Eligible investor sees quota from best active package and published items.
4. Submitting a review credits the fixed reward to wallet immediately and appears in wallet transactions.
5. Same item twice in a day, over-quota, ineligible user, and disabled item are all rejected server-side.
6. Admin completions table lists submissions.
