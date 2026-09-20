import { and, desc, eq } from "drizzle-orm";
import {
  auditLogs,
  payoutAccounts,
  users,
  walletTransactions,
  withdrawals,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { adminHasPermission } from "@/permissions/check";
import { maskAccountNumber } from "@/services/payout-account-service";
import { safeNotify } from "@/services/notification-service";
import { restoreAvailable } from "@/services/withdrawal-service";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) {
    throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  }
}

export async function listAdminWithdrawals(input: {
  adminId: string;
  status?: string;
}) {
  await requirePerm(input.adminId, "withdrawals.read");
  const db = getDb();
  const status = input.status ?? "PENDING";
  const rows = await db
    .select({
      w: withdrawals,
      userEmail: users.email,
      bankName: payoutAccounts.bankName,
      accountNumber: payoutAccounts.accountNumber,
      accountName: payoutAccounts.accountName,
    })
    .from(withdrawals)
    .innerJoin(users, eq(withdrawals.userId, users.id))
    .innerJoin(
      payoutAccounts,
      eq(withdrawals.payoutAccountId, payoutAccounts.id),
    )
    .where(eq(withdrawals.status, status))
    .orderBy(desc(withdrawals.createdAt))
    .limit(100);

  return rows.map((r) => ({
    id: r.w.id,
    amount: r.w.amount,
    currency: r.w.currency,
    status: r.w.status,
    userEmail: r.userEmail,
    bankName: r.bankName,
    accountName: r.accountName,
    accountNumberMasked: maskAccountNumber(r.accountNumber),
    createdAt: r.w.createdAt,
  }));
}

export async function getAdminWithdrawal(adminId: string, id: string) {
  await requirePerm(adminId, "withdrawals.read");
  const db = getDb();
  const [row] = await db
    .select({
      w: withdrawals,
      userEmail: users.email,
      userStatus: users.status,
      bankName: payoutAccounts.bankName,
      accountNumber: payoutAccounts.accountNumber,
      accountName: payoutAccounts.accountName,
    })
    .from(withdrawals)
    .innerJoin(users, eq(withdrawals.userId, users.id))
    .innerJoin(
      payoutAccounts,
      eq(withdrawals.payoutAccountId, payoutAccounts.id),
    )
    .where(eq(withdrawals.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  return {
    id: row.w.id,
    amount: row.w.amount,
    currency: row.w.currency,
    status: row.w.status,
    rejectionReason: row.w.rejectionReason,
    userEmail: row.userEmail,
    userStatus: row.userStatus,
    bankName: row.bankName,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
    createdAt: row.w.createdAt,
    reviewedAt: row.w.reviewedAt,
    processedAt: row.w.processedAt,
  };
}

export async function approveWithdrawal(adminId: string, id: string) {
  await requirePerm(adminId, "withdrawals.approve");
  const db = getDb();
  const detail = await getAdminWithdrawal(adminId, id);
  if (detail.status !== "PENDING") {
    throw new AppError(
      "INVALID_STATE",
      "Only PENDING withdrawals can be approved.",
      400,
    );
  }
  const now = new Date();
  const [updated] = await db
    .update(withdrawals)
    .set({
      status: "APPROVED",
      reviewedAt: now,
      reviewedBy: adminId,
      updatedAt: now,
    })
    .where(and(eq(withdrawals.id, id), eq(withdrawals.status, "PENDING")))
    .returning();
  if (!updated) {
    throw new AppError("INVALID_STATE", "Withdrawal state changed.", 400);
  }
  await db.insert(auditLogs).values({
    actorId: adminId,
    actorType: "ADMIN",
    action: "WITHDRAWAL_APPROVED",
    entityType: "withdrawal",
    entityId: id,
    before: { status: "PENDING" },
    after: { status: "APPROVED" },
  });
  return updated;
}

export async function rejectWithdrawal(
  adminId: string,
  id: string,
  reason: string,
) {
  await requirePerm(adminId, "withdrawals.reject");
  if (!reason.trim()) {
    throw new AppError("VALIDATION_ERROR", "reason is required.", 400);
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  if (row.status !== "PENDING") {
    throw new AppError(
      "INVALID_STATE",
      "Only PENDING withdrawals can be rejected.",
      400,
    );
  }

  await restoreAvailable(row);
  const now = new Date();
  const [updated] = await db
    .update(withdrawals)
    .set({
      status: "REJECTED",
      rejectionReason: reason.trim(),
      reviewedAt: now,
      reviewedBy: adminId,
      updatedAt: now,
    })
    .where(eq(withdrawals.id, id))
    .returning();

  if (row.walletTransactionId) {
    await db
      .update(walletTransactions)
      .set({ status: "FAILED", updatedAt: now })
      .where(eq(walletTransactions.id, row.walletTransactionId));
  }

  await db.insert(auditLogs).values({
    actorId: adminId,
    actorType: "ADMIN",
    action: "WITHDRAWAL_REJECTED",
    entityType: "withdrawal",
    entityId: id,
    before: { status: "PENDING" },
    after: { status: "REJECTED", reason: reason.trim() },
    reason: reason.trim(),
  });
  return updated!;
}

export async function processWithdrawal(adminId: string, id: string) {
  await requirePerm(adminId, "withdrawals.process");
  const db = getDb();
  const [row] = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  if (row.status !== "APPROVED") {
    throw new AppError(
      "INVALID_STATE",
      "Only APPROVED withdrawals can be processed.",
      400,
    );
  }

  const now = new Date();
  await db
    .update(withdrawals)
    .set({ status: "PROCESSING", updatedAt: now })
    .where(eq(withdrawals.id, id));

  // Mock bank send — always succeeds in v1
  const [updated] = await db
    .update(withdrawals)
    .set({
      status: "COMPLETED",
      processedAt: now,
      processedBy: adminId,
      updatedAt: now,
    })
    .where(eq(withdrawals.id, id))
    .returning();

  if (row.walletTransactionId) {
    await db
      .update(walletTransactions)
      .set({ status: "COMPLETED", updatedAt: now })
      .where(eq(walletTransactions.id, row.walletTransactionId));
  }

  await db.insert(auditLogs).values({
    actorId: adminId,
    actorType: "ADMIN",
    action: "WITHDRAWAL_PROCESSED",
    entityType: "withdrawal",
    entityId: id,
    before: { status: "APPROVED" },
    after: { status: "COMPLETED" },
  });

  await safeNotify({
    userId: row.userId,
    code: "WITHDRAWAL_COMPLETED",
    vars: { amount: row.amount },
    data: { withdrawalId: id },
  });

  return updated!;
}
