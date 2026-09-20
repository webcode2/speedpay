# Chunk 06 — Projects Design

**Date:** 2026-09-20  
**Status:** Approved — ready for implementation  
**Depends on:** Chunks 01–05  
**Scope:** Admin solar project CRUD, lifecycle, image/document uploads. No packages, marketplace, or Flutter.

## Decisions

| Decision | Choice |
|---|---|
| Clients | Admin web only |
| Storage | Existing `ObjectStorage` |
| Permissions | `projects.create`, `projects.update`, `projects.publish` (seeded) |
| Publish | `DRAFT` → `ACTIVE` (`projects.publish`) |
| Pause / Resume / Archive / Complete | `projects.update` |
| Investor UI | Deferred to Chunk 08 |

## Schema

**`projects`:** id, name, description, location, capacity (text), status (default DRAFT), startDate, completionDate, image (storage key nullable), createdAt, updatedAt  

**Statuses:** DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED  

**`project_documents`:** id, projectId, kind (IMAGE|DOCUMENT), storageKey, fileName, contentType, byteSize, createdAt  

## Lifecycle

- Create → DRAFT  
- Publish: DRAFT → ACTIVE  
- Pause: ACTIVE → PAUSED  
- Resume: PAUSED → ACTIVE  
- Complete: ACTIVE|PAUSED → COMPLETED  
- Archive: ACTIVE|PAUSED|COMPLETED → ARCHIVED  
- Edit metadata anytime except ARCHIVED (or allow edit on ARCHIVED read-only — **no edits on ARCHIVED**)

## APIs (admin session)

- GET/POST `/api/admin/projects`  
- GET/PATCH `/api/admin/projects/[id]`  
- POST `/api/admin/projects/[id]/{publish|pause|resume|complete|archive}`  
- POST `/api/admin/projects/[id]/documents` (multipart: kind, file; IMAGE may set `projects.image`)  
- GET `/api/admin/projects/[id]/documents/[docId]` (stream)

## UI

`/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]` — list, create, detail + actions + uploads. Nav links from KYC/payouts.

## Out of scope

Packages, lots, investments, Flutter, public project listing.
