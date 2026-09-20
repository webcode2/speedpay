# Chunk 03 — Authentication Design

**Date:** 2026-09-20  
**Status:** Approved — ready for implementation  
**Product:** Solar Investment Platform  
**Depends on:** Chunk 01–02 (monorepo, users, user_sessions, argon2 helpers)  
**Scope:** Investor email/password auth end-to-end (Next.js API + web screens + Flutter auth app). No Google OAuth. No admin login UI. No KYC.

---

## 1. Goal

Investors can register, log in, log out, recover passwords, and stay authenticated across Next.js web and Flutter via opaque Bearer session tokens backed by `user_sessions`.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Auth providers | Email/password only (Google deferred) |
| Session transport | Opaque Bearer token for API; web also sets httpOnly cookie with same token value |
| Session storage | `user_sessions.token_hash` = SHA-256 of raw token |
| Password hashing | argon2id via shared `database/auth/password.ts` (seed + web import the same module) |
| Flutter | Scaffold `apps/mobile` with auth feature only |
| Admin auth UI | Out of scope |
| Email delivery | Stub: in development, forgot-password response may include `resetToken` for testing; production returns generic success only |

---

## 3. Schema addition

### 3.1 `password_reset_tokens`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users.id | on delete cascade |
| `token_hash` | text | unique, not null |
| `expires_at` | timestamptz | not null |
| `used_at` | timestamptz | nullable |
| `created_at` | timestamptz | not null |

Index: `(user_id)`, `(expires_at)`.

Migration via Drizzle as part of Chunk 03.

No other schema changes. Reuse `users`, `user_profiles`, `user_sessions`.

---

## 4. API endpoints

All JSON use Chunk 01 envelopes. Auth required endpoints expect:

```http
Authorization: Bearer <raw-session-token>
```

Web cookie (optional companion): `session_token=<raw-session-token>`; HttpOnly; Secure in production; SameSite=Lax; Path=/

### 4.1 `POST /api/auth/register`

Body:

```json
{ "email": "string", "password": "string", "phone": "string?" }
```

Rules:

- Email normalized (trim, lowercase)
- Password min length from `system_settings.security.password_min_length` or default `12`
- Create user `status=EMAIL_UNVERIFIED`, create empty `user_profiles` row
- Create session; return token + public user

Errors: `VALIDATION_ERROR`, `EMAIL_TAKEN` (add code to `@solar/types`), `INTERNAL_ERROR`

### 4.2 `POST /api/auth/login`

Body: `{ "email", "password" }`

Rules:

- Reject `SUSPENDED` / `CLOSED` with `ACCOUNT_DISABLED`
- Invalid credentials → `INVALID_CREDENTIALS` (same message either way)
- Create session; return token + user

### 4.3 `POST /api/auth/logout`

Auth required. Set `revoked_at=now()` on current session. Clear cookie.

### 4.4 `GET /api/auth/me`

Auth required. Return public user (+ profile stub fields if present).

### 4.5 `POST /api/auth/forgot-password`

Body: `{ "email" }`

Always return success message (no email enumeration). If user exists:

- Invalidate prior unused tokens for user (set `used_at` or delete)
- Create token (raw random → hash), expiry 1 hour
- Dev only: include `resetToken` in `data` when `NODE_ENV=development`

### 4.6 `POST /api/auth/reset-password`

Body: `{ "token", "password" }`

- Lookup by hash; check not used; check not expired
- Update `password_hash`; mark token used; revoke all user sessions
- Return success (client should login again)

---

## 5. Server modules (`apps/web`)

```text
apps/web/src/
  auth/
    password.ts          # re-export or thin wrap of database auth password
    session.ts           # createSession, revokeSession, resolveSessionFromRequest
    tokens.ts            # generate opaque token, sha256 hash
    password-reset.ts    # create/consume reset tokens
  services/
    auth-service.ts      # register, login, logout, me, forgot, reset
  validators/
    auth.ts              # Zod schemas
```

Move shared password helpers to:

```text
database/auth/password.ts
```

Update `database/seed/hash.ts` to re-export from there (or delete and update seed imports).

Idempotency: not required for register/login in C03 (unique email constraint handles race).

---

## 6. Public user shape

```ts
type PublicUser = {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
};
```

Never return `passwordHash` or session hashes.

---

## 7. Next.js investor auth UI

Routes under `app/(auth)/`:

- `login/page.tsx`
- `register/page.tsx`
- `forgot-password/page.tsx`
- `reset-password/page.tsx` (reads `?token=` query)

Minimal Tailwind forms with loading / error / success states. On success login/register, set cookie via API `Set-Cookie` and redirect to `/` (or `/dashboard` placeholder page that shows email from `/api/auth/me`).

Add `app/dashboard/page.tsx` — simple “signed in as …” + logout button (investor shell only).

Middleware (optional C03): protect `/dashboard` by checking cookie presence (soft); **server still enforces** on `/api/auth/me`.

---

## 8. Flutter app (`apps/mobile`)

Scaffold with Flutter 3.x:

```text
apps/mobile/lib/
  core/api/api_client.dart
  core/auth/auth_repository.dart
  core/auth/session_store.dart      # flutter_secure_storage
  core/routing/
  features/auth/
    login_screen.dart
    register_screen.dart
    forgot_password_screen.dart
    reset_password_screen.dart
  main.dart
```

State management: **Provider** or **Riverpod** — **Decision: Provider** (simpler for C03).

Config: `API_BASE_URL` via `--dart-define` defaulting to `http://10.0.2.2:3000` (Android emulator) / documented localhost for iOS sim.

Screens call Next.js auth API; never compute financial values.

 monorepo note: Flutter is not a pnpm package; document `cd apps/mobile && flutter pub get` in README. Root README updated.

---

## 9. Error codes (extend `@solar/types`)

Add:

```text
EMAIL_TAKEN
INVALID_CREDENTIALS
ACCOUNT_DISABLED
UNAUTHORIZED
INVALID_RESET_TOKEN
```

---

## 10. Security rules

- Constant-time-ish password verify via argon2
- Generic login error messages
- Rate limiting: **out of scope** for C03 (document follow-up)
- HTTPS assumed in production
- Never log passwords or raw tokens
- Sessions revoked on password reset

---

## 11. Testing

- Unit: password hash verify (may already exist in database)
- Unit: token hash helpers
- Unit: Zod auth validators
- Integration-style service tests with mocked db **or** skip if no Postgres — prefer unit tests of pure helpers + validator tests; manual E2E when Docker up

---

## 12. Definition of Done

- [ ] `password_reset_tokens` migrated
- [ ] All six auth API endpoints work
- [ ] Next.js auth pages + dashboard shell
- [ ] Flutter auth screens + secure token storage
- [ ] Bearer auth resolves sessions from DB
- [ ] Loading/empty/error states on web auth forms
- [ ] Types error codes extended
- [ ] README documents auth + Flutter run
- [ ] No Google OAuth; no admin UI; no KYC
- [ ] Tests for validators + token/password helpers pass

---

## 13. Follow-on

- Chunk 04: profile + KYC  
- Later: Google OAuth, email provider, admin session auth, rate limits
