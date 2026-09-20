import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  projectDocuments,
  projects,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { adminHasPermission } from "@/permissions/check";
import { getStorage } from "@/storage";

export type ProjectInput = {
  name: string;
  description?: string | null;
  location?: string | null;
  capacity?: string | null;
  startDate?: string | null;
  completionDate?: string | null;
};

export const PROJECT_TRANSITIONS: Record<
  string,
  { to: string; from: string[]; permission: string }
> = {
  publish: { to: "ACTIVE", from: ["DRAFT"], permission: "projects.publish" },
  pause: { to: "PAUSED", from: ["ACTIVE"], permission: "projects.update" },
  resume: { to: "ACTIVE", from: ["PAUSED"], permission: "projects.update" },
  complete: {
    to: "COMPLETED",
    from: ["ACTIVE", "PAUSED"],
    permission: "projects.update",
  },
  archive: {
    to: "ARCHIVED",
    from: ["ACTIVE", "PAUSED", "COMPLETED"],
    permission: "projects.update",
  },
};

export function assertProjectTransition(
  action: keyof typeof PROJECT_TRANSITIONS,
  currentStatus: string,
) {
  const rule = PROJECT_TRANSITIONS[action];
  if (!rule) {
    throw new AppError("VALIDATION_ERROR", `Unknown action ${String(action)}.`, 400);
  }
  if (!rule.from.includes(currentStatus)) {
    throw new AppError(
      "INVALID_STATE",
      `Cannot ${action} a project in status ${currentStatus}.`,
      400,
    );
  }
  return rule;
}

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

async function getProjectOrThrow(id: string) {
  const db = getDb();
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Project not found.", 404);
  return row;
}

export async function listProjects(adminId: string, status?: string) {
  const can =
    (await adminHasPermission(adminId, "projects.update")) ||
    (await adminHasPermission(adminId, "projects.create")) ||
    (await adminHasPermission(adminId, "projects.publish"));
  if (!can) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  const db = getDb();
  const rows = status
    ? await db
        .select()
        .from(projects)
        .where(eq(projects.status, status))
        .orderBy(desc(projects.createdAt))
    : await db.select().from(projects).orderBy(desc(projects.createdAt));
  return rows;
}

export async function getProject(adminId: string, id: string) {
  const can =
    (await adminHasPermission(adminId, "projects.update")) ||
    (await adminHasPermission(adminId, "projects.create")) ||
    (await adminHasPermission(adminId, "projects.publish"));
  if (!can) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  const project = await getProjectOrThrow(id);
  const db = getDb();
  const documents = await db
    .select()
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, id))
    .orderBy(desc(projectDocuments.createdAt));
  return { project, documents };
}

export async function createProject(adminId: string, input: ProjectInput, meta: AuditMeta = {}) {
  await requirePerm(adminId, "projects.create");
  if (!input.name.trim()) {
    throw new AppError("VALIDATION_ERROR", "Name is required.", 400);
  }
  const db = getDb();
  const [created] = await db
    .insert(projects)
    .values({
      name: input.name.trim(),
      description: input.description ?? null,
      location: input.location ?? null,
      capacity: input.capacity ?? null,
      startDate: input.startDate ?? null,
      completionDate: input.completionDate ?? null,
      status: "DRAFT",
    })
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PROJECT_CREATED",
    entityType: "project",
    entityId: created!.id,
    after: { status: "DRAFT", name: created!.name },
    meta,
  });

  return created!;
}

export async function updateProject(
  adminId: string,
  id: string,
  input: ProjectInput,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "projects.update");
  const project = await getProjectOrThrow(id);
  if (project.status === "ARCHIVED") {
    throw new AppError("INVALID_STATE", "Archived projects cannot be edited.", 400);
  }
  const db = getDb();
  const now = new Date();
  const [updated] = await db
    .update(projects)
    .set({
      name: input.name.trim(),
      description: input.description ?? null,
      location: input.location ?? null,
      capacity: input.capacity ?? null,
      startDate: input.startDate ?? null,
      completionDate: input.completionDate ?? null,
      updatedAt: now,
    })
    .where(eq(projects.id, id))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PROJECT_UPDATED",
    entityType: "project",
    entityId: id,
    before: { name: project.name },
    after: { name: updated!.name },
    meta,
  });

  return updated!;
}

export async function transitionProject(
  adminId: string,
  id: string,
  action: keyof typeof PROJECT_TRANSITIONS,
  meta: AuditMeta = {},
) {
  const project = await getProjectOrThrow(id);
  const rule = assertProjectTransition(action, project.status);
  await requirePerm(adminId, rule.permission);

  const db = getDb();
  const now = new Date();
  const [updated] = await db
    .update(projects)
    .set({ status: rule.to, updatedAt: now })
    .where(eq(projects.id, id))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: `PROJECT_${action.toUpperCase()}`,
    entityType: "project",
    entityId: id,
    before: { status: project.status },
    after: { status: rule.to },
    meta,
  });

  return updated!;
}

export async function uploadProjectDocument(input: {
  adminId: string;
  projectId: string;
  kind: string;
  fileName: string;
  contentType: string;
  bytes: Buffer;
  setAsPrimaryImage?: boolean;
  meta?: AuditMeta;
}) {
  const meta = input.meta ?? {};
  await requirePerm(input.adminId, "projects.update");
  if (!["IMAGE", "DOCUMENT"].includes(input.kind)) {
    throw new AppError("VALIDATION_ERROR", "kind must be IMAGE or DOCUMENT.", 400);
  }
  const project = await getProjectOrThrow(input.projectId);
  if (project.status === "ARCHIVED") {
    throw new AppError("INVALID_STATE", "Archived projects cannot accept uploads.", 400);
  }

  const key = `projects/${input.projectId}/${input.kind.toLowerCase()}-${randomUUID()}`;
  const storage = getStorage();
  await storage.put(key, input.bytes, input.contentType);

  const db = getDb();
  const [doc] = await db
    .insert(projectDocuments)
    .values({
      projectId: input.projectId,
      kind: input.kind,
      storageKey: key,
      fileName: input.fileName,
      contentType: input.contentType,
      byteSize: input.bytes.length,
    })
    .returning();

  if (input.kind === "IMAGE" && (input.setAsPrimaryImage ?? true)) {
    await db
      .update(projects)
      .set({ image: key, updatedAt: new Date() })
      .where(eq(projects.id, input.projectId));
  }

  await writeAdminAudit(db, {
    actorId: input.adminId,
    action: "PROJECT_DOCUMENT_UPLOADED",
    entityType: "project",
    entityId: input.projectId,
    after: { documentId: doc!.id, kind: input.kind },
    meta,
  });

  return doc!;
}

export async function getProjectDocumentStream(
  adminId: string,
  projectId: string,
  docId: string,
) {
  const can =
    (await adminHasPermission(adminId, "projects.update")) ||
    (await adminHasPermission(adminId, "projects.create")) ||
    (await adminHasPermission(adminId, "projects.publish"));
  if (!can) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  const db = getDb();
  const [doc] = await db
    .select()
    .from(projectDocuments)
    .where(eq(projectDocuments.id, docId))
    .limit(1);
  if (!doc || doc.projectId !== projectId) {
    throw new AppError("NOT_FOUND", "Document not found.", 404);
  }
  const body = await getStorage().get(doc.storageKey);
  return { doc, body };
}
