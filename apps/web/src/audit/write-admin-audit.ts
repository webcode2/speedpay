import { auditLogs } from "@solar/database/schema";

export type AuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type WriteAdminAuditInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  meta?: AuditMeta;
};

export function auditValues(input: WriteAdminAuditInput) {
  return {
    actorId: input.actorId,
    actorType: "ADMIN" as const,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
    ipAddress: input.meta?.ipAddress ?? null,
    userAgent: input.meta?.userAgent ?? null,
  };
}

/** Shared admin audit writer — actor_type ADMIN + optional IP/UA from requestMeta. */
export async function writeAdminAudit(
  // drizzle db or transaction both expose .insert()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: { insert: (table: typeof auditLogs) => { values: (v: any) => any } },
  input: WriteAdminAuditInput,
): Promise<void> {
  await db.insert(auditLogs).values(auditValues(input));
}
