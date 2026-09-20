import { and, desc, eq, isNull } from "drizzle-orm";
import { auditLogs, payoutAccounts, users } from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { adminHasPermission } from "@/permissions/check";
import { maskAccountNumber } from "@/services/payout-account-service";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) {
    throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  }
}

export async function listPayoutQueue(input: {
  adminId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  await requirePerm(input.adminId, "payouts.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;
  const status = input.status ?? "PENDING";

  const rows = await db
    .select({
      account: payoutAccounts,
      userEmail: users.email,
    })
    .from(payoutAccounts)
    .innerJoin(users, eq(payoutAccounts.userId, users.id))
    .where(
      and(
        eq(payoutAccounts.status, status),
        isNull(payoutAccounts.deletedAt),
      ),
    )
    .orderBy(desc(payoutAccounts.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.account.id,
    userId: r.account.userId,
    userEmail: r.userEmail,
    bankName: r.account.bankName,
    accountNumberMasked: maskAccountNumber(r.account.accountNumber),
    accountName: r.account.accountName,
    isDefault: r.account.isDefault,
    status: r.account.status,
    createdAt: r.account.createdAt,
    updatedAt: r.account.updatedAt,
  }));
}

export async function getPayoutDetail(adminId: string, id: string) {
  await requirePerm(adminId, "payouts.read");
  const db = getDb();
  const [row] = await db
    .select({
      account: payoutAccounts,
      userEmail: users.email,
      userStatus: users.status,
    })
    .from(payoutAccounts)
    .innerJoin(users, eq(payoutAccounts.userId, users.id))
    .where(and(eq(payoutAccounts.id, id), isNull(payoutAccounts.deletedAt)))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Payout account not found.", 404);

  return {
    id: row.account.id,
    userId: row.account.userId,
    userEmail: row.userEmail,
    userStatus: row.userStatus,
    bankName: row.account.bankName,
    accountNumber: row.account.accountNumber,
    accountName: row.account.accountName,
    isDefault: row.account.isDefault,
    status: row.account.status,
    rejectionReason: row.account.rejectionReason,
    reviewedAt: row.account.reviewedAt,
    reviewedBy: row.account.reviewedBy,
    createdAt: row.account.createdAt,
    updatedAt: row.account.updatedAt,
  };
}

export async function approvePayout(adminId: string, id: string, meta: AuditMeta = {}) {
  await requirePerm(adminId, "payouts.approve");
  const detail = await getPayoutDetail(adminId, id);
  if (detail.status !== "PENDING") {
    throw new AppError(
      "INVALID_STATE",
      "Only pending payout accounts can be approved.",
      400,
    );
  }

  const db = getDb();
  const now = new Date();
  const [updated] = await db
    .update(payoutAccounts)
    .set({
      status: "VERIFIED",
      reviewedAt: now,
      reviewedBy: adminId,
      rejectionReason: null,
      updatedAt: now,
    })
    .where(eq(payoutAccounts.id, id))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PAYOUT_APPROVED",
    entityType: "payout_account",
    entityId: id,
    before: { status: detail.status },
    after: { status: "VERIFIED" },
    meta,
  });

  return updated!;
}

export async function rejectPayout(
  adminId: string,
  id: string,
  reason: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "payouts.reject");
  if (!reason.trim()) {
    throw new AppError("VALIDATION_ERROR", "Rejection reason is required.", 400);
  }
  const detail = await getPayoutDetail(adminId, id);
  if (detail.status !== "PENDING") {
    throw new AppError(
      "INVALID_STATE",
      "Only pending payout accounts can be rejected.",
      400,
    );
  }

  const db = getDb();
  const now = new Date();
  const [updated] = await db
    .update(payoutAccounts)
    .set({
      status: "REJECTED",
      reviewedAt: now,
      reviewedBy: adminId,
      rejectionReason: reason.trim(),
      updatedAt: now,
    })
    .where(eq(payoutAccounts.id, id))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PAYOUT_REJECTED",
    entityType: "payout_account",
    entityId: id,
    before: { status: detail.status },
    after: { status: "REJECTED", reason: reason.trim() },
    reason: reason.trim(),
    meta,
  });

  return updated!;
}
