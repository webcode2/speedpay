# Chunk 04 — User Profile & Verification Design

**Date:** 2026-09-20  
**Status:** Approved — ready for implementation  
**Product:** Solar Investment Platform  
**Depends on:** Chunks 01–03 (users, profiles, sessions, auth, RBAC permissions)  
**Scope:** Investor profile CRUD, KYC submission + status, document storage (local/R2), admin staff login, admin KYC review. No payout accounts. No Google OAuth. No external KYC vendor.

---

## 1. Goal

Investors can complete and edit their profile, submit identity verification with documents, and track status. Staff (seeded SUPER_ADMIN / KYC_OFFICER) can log in and approve/reject/request information — with server-enforced permissions and audit logs.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Object storage | `ObjectStorage` interface; `STORAGE_DRIVER=local` (dev) or `r2` (prod) |
| Staff auth | Opaque Bearer sessions in new `admin_sessions` (mirror investor pattern) |
| KYC vendor | None — manual admin review only |
| Flutter | Profile + verification + status screens |
| Payout accounts | Chunk 05 |

---

## 3. Schema additions

### 3.1 `admin_sessions`

Same shape as `user_sessions`, FK → `admins.id`:

| Column | Type |
|---|---|
| `id` | uuid PK |
| `admin_id` | uuid FK → admins |
| `token_hash` | text unique |
| `ip_address` | text nullable |
| `user_agent` | text nullable |
| `expires_at` | timestamptz |
| `revoked_at` | timestamptz nullable |
| `created_at` | timestamptz |

### 3.2 `verification_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `status` | text | see statuses |
| `submitted_at` | timestamptz | nullable until submit |
| `reviewed_at` | timestamptz | nullable |
| `reviewed_by` | uuid | FK → admins, nullable |
| `rejection_reason` | text | nullable |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Statuses:

```text
NOT_STARTED
PENDING
UNDER_REVIEW
APPROVED
REJECTED
REQUIRES_INFORMATION
```

Rules:

- One **active** request per user (status not in `APPROVED`); on re-submit after reject/requires_info, create a new request or reopen — **Decision: create new request row**; keep history.
- User may only submit when profile has required fields: `first_name`, `last_name`, `date_of_birth`, `country` (minimum).

### 3.3 `verification_documents`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `verification_request_id` | uuid FK | cascade |
| `document_type` | text | `ID_FRONT`, `ID_BACK`, `SELFIE`, `PROOF_OF_ADDRESS` |
| `storage_key` | text | path/key in object storage |
| `file_name` | text | original name |
| `content_type` | text | |
| `byte_size` | integer | |
| `created_at` | timestamptz | |

Minimum for submit: `ID_FRONT` + `SELFIE`. Others optional in C04.

---

## 4. Object storage

```ts
interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  // Optional: getSignedUrl for private R2 reads — C04 admin can stream via API proxy instead
}
```

- **Local:** write under `LOCAL_UPLOAD_DIR` (default `uploads/`), gitignored.
- **R2:** S3 API via `@aws-sdk/client-s3` with R2 endpoint.

Env:

```text
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=uploads
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=           # https://<accountid>.r2.cloudflarestorage.com
```

Document download for admins: authenticated API route streams bytes (no public bucket required in C04).

---

## 5. Investor API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/profile` | user | Get profile + user status |
| PATCH | `/api/profile` | user | Update profile fields |
| GET | `/api/verification` | user | Current/latest verification + docs metadata |
| POST | `/api/verification` | user | Start/submit request (multipart or JSON+upload) |
| POST | `/api/verification/documents` | user | Upload one document for a draft/pending request |

Submit flow:

1. Ensure profile complete  
2. Create request `PENDING` (or update draft)  
3. Require docs present  
4. Set `submitted_at`  
5. Set user status → `KYC_PENDING` if not already approved  

---

## 6. Admin / staff API

| Method | Path | Permission |
|---|---|---|
| POST | `/api/admin/auth/login` | — |
| POST | `/api/admin/auth/logout` | staff session |
| GET | `/api/admin/auth/me` | staff session (+ roles/permissions) |
| GET | `/api/admin/kyc` | `kyc.read` |
| GET | `/api/admin/kyc/:id` | `kyc.read` |
| POST | `/api/admin/kyc/:id/approve` | `kyc.approve` |
| POST | `/api/admin/kyc/:id/reject` | `kyc.reject` |
| POST | `/api/admin/kyc/:id/request-info` | `kyc.approve` |
| GET | `/api/admin/kyc/:id/documents/:docId` | `kyc.read` | stream file |

Approve:

- Set request `APPROVED`, `reviewed_by`, `reviewed_at`  
- User status → `KYC_APPROVED`  
- Audit `KYC_APPROVED`

Reject:

- Require `reason`  
- Request `REJECTED`; user `KYC_REJECTED`  
- Audit `KYC_REJECTED`

Request info:

- Request `REQUIRES_INFORMATION` + reason  
- User stays `KYC_PENDING`  
- Audit `KYC_REQUIRES_INFORMATION`

Permission checks: load admin roles → role_permissions → codes; reject with `FORBIDDEN` if missing.

Add error codes: `FORBIDDEN`, `PROFILE_INCOMPLETE`, `VERIFICATION_INVALID_STATE`, `NOT_FOUND`.

---

## 7. UI

### Investor web

- `/profile` — view/edit  
- `/verification` — status + upload/submit  
- Link from dashboard  

### Admin web

- `/admin/login`  
- `/admin/kyc` — queue (filter by status)  
- `/admin/kyc/[id]` — detail, docs preview (via stream URL), actions  

Soft route guards only; APIs enforce authz.

### Flutter

- Profile screen (edit)  
- Verification screen (pick docs + submit)  
- Verification status screen  

---

## 8. Server modules

```text
apps/web/src/
  storage/
    types.ts
    local.ts
    r2.ts
    index.ts              # factory from env
  services/
    profile-service.ts
    verification-service.ts
    admin-auth-service.ts
    admin-kyc-service.ts
  auth/
    admin-session.ts      # parallel to user session
  permissions/
    check.ts              # adminHasPermission(adminId, code)
```

---

## 9. Testing

- Unit: permission check helper  
- Unit: verification status transition guards  
- Unit: storage local put/get (temp dir)  
- Validator tests for profile + KYC payloads  

---

## 10. Definition of Done

- [ ] Migrations for `admin_sessions`, `verification_requests`, `verification_documents`  
- [ ] Local + R2 storage adapters; driver selected by env  
- [ ] Investor profile + verification APIs and web UI  
- [ ] Admin login + KYC queue/review with permission enforcement + audit  
- [ ] Flutter profile + verification screens  
- [ ] README documents storage env vars  
- [ ] No payout accounts; no external KYC vendor  

---

## 11. Follow-on

**Chunk 05 — Payout Accounts**
