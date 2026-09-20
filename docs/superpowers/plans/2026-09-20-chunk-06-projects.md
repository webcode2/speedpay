# Chunk 06 — Projects Implementation Plan

> **For agentic workers:** Use executing-plans or subagent-driven-development.

**Goal:** Admin project management with media uploads via ObjectStorage.

**Architecture:** Drizzle `projects` + `project_documents`; admin APIs with RBAC + audit; admin web UI. No Flutter.

**Spec:** [../specs/2026-09-20-chunk-06-projects-design.md](../specs/2026-09-20-chunk-06-projects-design.md)

## Global Constraints

- Admin web only; no investor pages/Flutter
- No packages/investments
- Branch: `chunk-06-projects`
- Migrate deferred if no Postgres

## Tasks

1. Schema + migration (`projects`, `project_documents`, enums)  
2. `admin-project-service` + APIs + tests for transitions  
3. Admin UI pages + nav  
4. README + DoD (`pnpm` test/build)

## File map

- `database/schema/projects.ts`, `project-documents.ts`  
- `apps/web/src/services/admin-project-service.ts`  
- `apps/web/app/api/admin/projects/**`  
- `apps/web/app/admin/projects/**`
