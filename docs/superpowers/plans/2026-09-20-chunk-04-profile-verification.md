# Chunk 04 — Profile & Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Investor profile editing, KYC submit/status with document uploads (local/R2), staff login, and admin KYC review with RBAC + audit.

**Architecture:** Extend Drizzle schema; `ObjectStorage` factory (`local` | `r2`); investor Bearer auth (existing) + new admin session auth; permission checks via role_permissions.

**Tech Stack:** Next.js, Zod, Drizzle, `@aws-sdk/client-s3` (R2), Flutter (existing app)

**Spec:** [docs/superpowers/specs/2026-09-20-chunk-04-profile-verification-design.md](../specs/2026-09-20-chunk-04-profile-verification-design.md)

## Global Constraints

- `STORAGE_DRIVER=local` in dev; `r2` in prod
- Server enforces `kyc.*` permissions — UI hiding is not enough
- Audit every KYC approve/reject/request-info
- No payout accounts; no external KYC vendor; no Google OAuth
- No cron/workers
- Branch: `chunk-04-profile-verification` from current HEAD

---

## Tasks Overview

1. Schema: `admin_sessions`, `verification_requests`, `verification_documents` + migration  
2. Object storage adapters + factory  
3. Error codes + admin session auth API  
4. Profile API + web UI + Flutter profile  
5. Investor verification API (upload/submit/status) + web UI  
6. Admin KYC API (queue, detail, actions, doc stream) + permission helper  
7. Admin web UI (login + KYC queue/detail)  
8. Flutter verification screens  
9. README / env / verification  

---

### Task 1: Schema + migration

**Files:**
- Create: `database/schema/admin-sessions.ts`
- Create: `database/schema/verification-requests.ts`
- Create: `database/schema/verification-documents.ts`
- Modify: `database/schema/index.ts`, `relations.ts`
- Generate migration `0003_*.sql`

Mirror `user_sessions` for admins. Verification tables per spec. Export constants for statuses/document types in `database/schema/enums.ts` (extend).

```bash
pnpm db:generate && pnpm --filter @solar/database build
```

Commit: `feat(database): add admin sessions and verification schema`

---

### Task 2: Object storage

**Files:**
- `apps/web/src/storage/types.ts` — `ObjectStorage` interface  
- `apps/web/src/storage/local.ts`  
- `apps/web/src/storage/r2.ts` — `@aws-sdk/client-s3`  
- `apps/web/src/storage/index.ts` — `getStorage()` from env  
- Unit test: local put/get/delete in `os.tmpdir()`

Env keys per spec. Add deps to `@solar/web`: `@aws-sdk/client-s3`.

Commit: `feat(web): add local and R2 object storage adapters`

---

### Task 3: Admin auth

**Files:**
- `apps/web/src/auth/admin-session.ts`  
- `apps/web/src/services/admin-auth-service.ts`  
- `apps/web/src/permissions/check.ts` — `adminHasPermission(adminId, code)`  
- Routes: `POST /api/admin/auth/login`, `logout`, `GET me`  
- Cookie: `admin_session_token` (separate from investor)  
- Extend `ApiErrorCode` with `FORBIDDEN`, `PROFILE_INCOMPLETE`, `VERIFICATION_INVALID_STATE`, `NOT_FOUND`

`me` returns admin `{ id, email, name, status, roles: string[], permissions: string[] }`.

Commit: `feat(auth): add staff admin login and permission checks`

---

### Task 4: Profile API + UI

**Files:**
- `apps/web/src/services/profile-service.ts`  
- `GET/PATCH /api/profile`  
- Zod profile schema  
- `app/profile/page.tsx`  
- Dashboard link  
- Flutter: profile screen + repository methods  

Required fields for KYC gate: firstName, lastName, dateOfBirth, country.

Commit: `feat: add investor profile API and UIs`

---

### Task 5: Investor verification

**Files:**
- `verification-service.ts` — get status, create/upload doc, submit  
- Routes under `/api/verification`  
- Multipart upload via `request.formData()`; store via `getStorage()`; key pattern `kyc/{userId}/{requestId}/{docType}-{uuid}`  
- Web: `/verification` page  
- Tests: status transition guards (cannot submit without docs/profile)

Commit: `feat: add investor KYC submission flow`

---

### Task 6: Admin KYC API

**Files:**
- `admin-kyc-service.ts`  
- List with status filter + pagination  
- Detail with docs metadata  
- approve / reject / request-info  
- Document stream route  
- Require permissions; write `audit_logs`

Commit: `feat(admin): add KYC review APIs with RBAC and audit`

---

### Task 7: Admin web UI

**Files:**
- `/admin/login`  
- `/admin/kyc` queue  
- `/admin/kyc/[id]` detail + actions + iframe/img for docs via stream URL  

Commit: `feat(admin): add KYC review UI`

---

### Task 8: Flutter verification screens

**Files under `apps/mobile`:**
- verification repository methods  
- profile already in T4  
- verification submit + status screens  
- wire routes from home  

Commit: `feat(mobile): add profile and verification screens`

---

### Task 9: Docs + DoD

- Update `.env.example` with storage + note R2 vars  
- README: profile/KYC/admin login (`admin@solar.local`)  
- `uploads/` in `.gitignore`  
- Run: database build/test, web test/lint/build, `flutter analyze`  
- Migrate deferred if no Postgres  

---

## Plan Self-Review

Spec tables → T1; storage local/R2 → T2; staff auth → T3; profile → T4; investor KYC → T5; admin KYC + RBAC + audit → T6–7; Flutter → T4/T8; docs → T9. No payouts/vendor.
