# Chunk 03 — Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver investor email/password auth end-to-end: schema for password reset tokens, Next.js auth API + web screens, Flutter auth client with secure session storage.

**Architecture:** Custom auth services on Next.js. Opaque Bearer sessions hashed in `user_sessions`. Shared argon2 helpers in `database/auth/password.ts`. Flutter talks to the same HTTPS API.

**Tech Stack:** Next.js App Router, Zod, argon2, Drizzle, Flutter + Provider + flutter_secure_storage + http

**Spec:** [docs/superpowers/specs/2026-09-20-chunk-03-authentication-design.md](../specs/2026-09-20-chunk-03-authentication-design.md)

## Global Constraints

- Email/password only — no Google OAuth
- Opaque Bearer tokens; web may also set `session_token` httpOnly cookie with same raw token
- `user_sessions.token_hash` = SHA-256 hex of raw token (never store raw token)
- Password hashing via `database/auth/password.ts` (argon2id)
- No admin login UI; no KYC; no financial logic
- No cron/workers
- Never log passwords or raw tokens
- Flutter must not compute financial values
- Work on branch `chunk-03-authentication` created from current HEAD

---

## File Structure (target)

```text
database/auth/password.ts
database/schema/password-reset-tokens.ts
database/schema/index.ts                         # modify
database/seed/hash.ts                            # re-export from auth/password
database/seed/admin.ts                           # update import if needed
packages/types/src/api.ts                        # extend ApiErrorCode
apps/web/src/auth/tokens.ts
apps/web/src/auth/session.ts
apps/web/src/auth/password-reset.ts
apps/web/src/auth/password.ts                    # re-export database auth
apps/web/src/validators/auth.ts
apps/web/src/services/auth-service.ts
apps/web/src/lib/cookies.ts
apps/web/app/api/auth/register/route.ts
apps/web/app/api/auth/login/route.ts
apps/web/app/api/auth/logout/route.ts
apps/web/app/api/auth/me/route.ts
apps/web/app/api/auth/forgot-password/route.ts
apps/web/app/api/auth/reset-password/route.ts
apps/web/app/(auth)/login/page.tsx
apps/web/app/(auth)/register/page.tsx
apps/web/app/(auth)/forgot-password/page.tsx
apps/web/app/(auth)/reset-password/page.tsx
apps/web/app/dashboard/page.tsx
apps/web/src/auth/tokens.test.ts
apps/web/src/validators/auth.test.ts
apps/mobile/                                     # Flutter scaffold + auth
.env.example                                     # SESSION_TTL_DAYS
README.md
```

---

### Task 1: Shared password module + error codes + reset-token schema

**Files:**
- Create: `database/auth/password.ts`
- Modify: `database/seed/hash.ts`
- Modify: `database/package.json` exports if needed (`"./auth/password": "./auth/password.ts"`)
- Modify: `packages/types/src/api.ts`
- Create: `database/schema/password-reset-tokens.ts`
- Modify: `database/schema/index.ts`
- Generate migration

- [ ] **Step 1: Move password helpers**

Create `database/auth/password.ts` with current argon2 implementation from `seed/hash.ts`.

Replace `database/seed/hash.ts` with:

```ts
export { hashPassword, verifyPassword } from "../auth/password";
```

Add package export in `database/package.json`:

```json
"./auth/password": "./auth/password.ts"
```

Ensure `database/tsconfig.json` include covers `auth`.

- [ ] **Step 2: Extend `ApiErrorCode`**

```ts
export type ApiErrorCode =
  | "INTERNAL_ERROR"
  | "DATABASE_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "UNAUTHORIZED"
  | "INVALID_RESET_TOKEN";
```

- [ ] **Step 3: Create `password_reset_tokens` table**

```ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("password_reset_tokens_user_id_idx").on(t.userId),
    index("password_reset_tokens_expires_at_idx").on(t.expiresAt),
  ],
);
```

Export from `schema/index.ts`.

- [ ] **Step 4: Generate migration**

```bash
pnpm db:generate
pnpm --filter @solar/database test
pnpm --filter @solar/database build
```

Apply migrate if Postgres available.

- [ ] **Step 5: Commit**

```bash
git add database packages/types
git -c user.email="dev@solar.local" -c user.name="Solar Dev" commit -m "feat(database): add password auth helpers and reset-token schema"
```

---

### Task 2: Token + session helpers (TDD)

**Files:**
- Create: `apps/web/src/auth/tokens.ts`
- Create: `apps/web/src/auth/tokens.test.ts`
- Create: `apps/web/src/auth/session.ts`
- Create: `apps/web/src/auth/password.ts`
- Create: `apps/web/src/lib/cookies.ts`
- Modify: `apps/web/package.json` — add `argon2` dependency if importing from database auth pulls it transitively; prefer dependency on `@solar/database` already present

- [ ] **Step 1: Write failing token tests**

```ts
import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashToken } from "./tokens";

describe("tokens", () => {
  it("generates unique opaque tokens", () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes deterministically with sha256 hex", () => {
    const h1 = hashToken("abc");
    const h2 = hashToken("abc");
    expect(h1).toEqual(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).not.toEqual("abc");
  });
});
```

- [ ] **Step 2: Implement `tokens.ts`**

```ts
import { createHash, randomBytes } from "node:crypto";

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
```

- [ ] **Step 3: Implement session helpers**

`session.ts` exports:

- `createUserSession(db, { userId, ip?, userAgent? }) => { rawToken, session }`
- `revokeSessionByHash(db, tokenHash)`
- `revokeAllUserSessions(db, userId)`
- `resolveSession(db, rawToken) => { user, session } | null` (join users; reject if revoked/expired)

TTL: `Number(process.env.SESSION_TTL_DAYS ?? 30)` days from now.

- [ ] **Step 4: Cookie helpers**

```ts
export const SESSION_COOKIE = "session_token";

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
```

Use Next.js `cookies()` from `next/headers` in route handlers to set/clear.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @solar/web test
```

- [ ] **Step 6: Commit**

---

### Task 3: Auth validators + auth service

**Files:**
- Create: `apps/web/src/validators/auth.ts`
- Create: `apps/web/src/validators/auth.test.ts`
- Create: `apps/web/src/auth/password-reset.ts`
- Create: `apps/web/src/services/auth-service.ts`
- Create: `apps/web/src/auth/public-user.ts`

- [ ] **Step 1: Zod schemas**

```ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(12),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12),
});
```

Note: password min 12 matches default setting; optionally read setting in service and re-validate.

- [ ] **Step 2: Validator tests** — valid/invalid email, short password.

- [ ] **Step 3: `toPublicUser(user)` helper**

- [ ] **Step 4: `auth-service.ts` methods**

```ts
register(input, meta) -> { token, user }
login(input, meta) -> { token, user }
logout(rawToken) -> void
me(rawToken) -> user
forgotPassword(email) -> { message, resetToken? }
resetPassword(token, password) -> void
```

Use transactions for register (user + profile + session).

Login: look up by email; if missing or bad password → throw AppError `INVALID_CREDENTIALS`; if status in `SUSPENDED|CLOSED` → `ACCOUNT_DISABLED`.

Forgot: always succeed; if user found create reset token.

Reset: validate token row; update password; mark used; revoke all sessions.

Define small `AppError` class with `code` + `message` + `status`.

- [ ] **Step 5: Commit**

---

### Task 4: Auth API routes

**Files:**
- Create six route handlers under `apps/web/app/api/auth/*/route.ts`
- Helper: `apps/web/src/auth/request.ts` — `getBearerOrCookieToken(req)`

- [ ] **Step 1: `getBearerOrCookieToken`**

Parse `Authorization: Bearer …` first; else cookie `session_token`.

- [ ] **Step 2: Implement routes**

Each route: parse JSON → Zod → service → `apiSuccess` / map `AppError` to `apiError`.

Register/login responses set session cookie via `Set-Cookie` using `cookies().set`.

Logout clears cookie.

Forgot-password: in development include `resetToken` in data.

Statuses:

| Code | HTTP |
|---|---|
| VALIDATION_ERROR | 400 |
| EMAIL_TAKEN | 409 |
| INVALID_CREDENTIALS | 401 |
| ACCOUNT_DISABLED | 403 |
| UNAUTHORIZED | 401 |
| INVALID_RESET_TOKEN | 400 |

- [ ] **Step 3: Smoke with curl if Postgres up; otherwise document**

- [ ] **Step 4: Commit**

---

### Task 5: Next.js auth UI + dashboard

**Files:**
- Create auth pages under `app/(auth)/`
- Create `app/dashboard/page.tsx`
- Optional shared `components/auth-form.tsx`

- [ ] **Step 1: Login/Register pages** — client components posting to API; show error from envelope; on success `router.push('/dashboard')`.

- [ ] **Step 2: Forgot / Reset pages** — reset reads `searchParams.token`.

- [ ] **Step 3: Dashboard** — server component calls `me` via cookie/session resolve (prefer calling service/`resolveSession` directly server-side, not HTTP loopback). Show email + logout form posting to `/api/auth/logout`.

- [ ] **Step 4: Soft middleware** (optional): `middleware.ts` redirects `/dashboard` to `/login` if no cookie — not a security boundary.

- [ ] **Step 5: Commit**

---

### Task 6: Flutter auth app

**Files:**
- Create `apps/mobile/` via `flutter create --org com.solar.investment --project-name solar_investment_mobile apps/mobile` if Flutter SDK available; if not, hand-write minimal structure + `pubspec.yaml` and document that `flutter create` must be run — **prefer run flutter create when SDK exists**.

Dependencies: `http`, `provider`, `flutter_secure_storage`, `go_router` (or simple Navigator).

- [ ] **Step 1: Scaffold project**

- [ ] **Step 2: `ApiClient`** — base URL from `String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000')`; JSON envelope decode; attach Bearer from `SessionStore`.

- [ ] **Step 3: `SessionStore`** — read/write/clear token in secure storage.

- [ ] **Step 4: `AuthRepository`** — register, login, logout, me, forgot, reset.

- [ ] **Step 5: Screens** — login, register, forgot, reset; loading/error/success.

- [ ] **Step 6: `main.dart`** — Provider + initial route based on stored token.

- [ ] **Step 7: Commit** (do not commit `build/` or ephemeral files; use `.gitignore` from flutter create)

If Flutter SDK missing: create source files + pubspec manually; note in report `flutter` CLI unavailable — structure still lands in repo.

---

### Task 7: Env, README, verification

- [ ] **Step 1: `.env.example`** add `SESSION_TTL_DAYS=30`

- [ ] **Step 2: README** — auth endpoints summary, web auth URLs, Flutter run commands, note Google deferred

- [ ] **Step 3: Verify**

```bash
pnpm --filter @solar/types build || true
pnpm --filter @solar/database test
pnpm --filter @solar/database build
pnpm --filter @solar/web test
pnpm --filter @solar/web build
pnpm --filter @solar/web lint
```

- [ ] **Step 4: Stop** — do not start Chunk 04 unless asked.

---

## Plan Self-Review

**Spec coverage:** reset tokens schema → T1; Bearer/cookie sessions → T2/T4; six endpoints → T4; web UI → T5; Flutter → T6; error codes → T1; password module → T1; tests → T2/T3/T7.

**No Google/admin/KYC** in any task.

**Type consistency:** `ApiErrorCode` extended before routes; `PublicUser` shape matches service returns.
