import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { auditLogs } from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { requireAdminPermission } from "@/permissions/check";

export async function listAuditLogs(input: {
  adminId: string;
  action?: string;
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdminPermission(input.adminId, "audit.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const filters = [];
  if (input.action?.trim()) filters.push(eq(auditLogs.action, input.action.trim()));
  if (input.entityType?.trim()) {
    filters.push(eq(auditLogs.entityType, input.entityType.trim()));
  }
  if (input.actorId?.trim()) {
    filters.push(eq(auditLogs.actorId, input.actorId.trim()));
  }
  if (input.from) {
    const d = new Date(input.from);
    if (Number.isNaN(d.getTime())) {
      throw new AppError("VALIDATION_ERROR", "Invalid from date.", 400);
    }
    filters.push(gte(auditLogs.createdAt, d));
  }
  if (input.to) {
    const d = new Date(input.to);
    if (Number.isNaN(d.getTime())) {
      throw new AppError("VALIDATION_ERROR", "Invalid to date.", 400);
    }
    filters.push(lte(auditLogs.createdAt, d));
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      actorType: auditLogs.actorType,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      reason: auditLogs.reason,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(auditLogs)
    .where(where);

  return { items: rows, total: countRow?.n ?? 0, limit, offset };
}

export async function getAuditLog(adminId: string, id: string) {
  await requireAdminPermission(adminId, "audit.read");
  const db = getDb();
  const [row] = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Audit log not found.", 404);
  return row;
}
