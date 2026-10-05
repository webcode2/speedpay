import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  admins,
  deposits,
  platformPaymentAccounts,
  userProfiles,
  users,
} from "@solar/database/schema";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { requireAnyAdminPermission } from "@/permissions/check";
import { safeNotify } from "@/services/notification-service";
import { postLedgerEntry } from "@/services/wallet-service";

export async function listAdminDeposits(input: {
  adminId: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAnyAdminPermission(input.adminId, [
    "deposits.read",
    "deposits.approve",
    "deposits.reject",
  ]);
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const conditions = [];
  if (input.status && input.status !== "ALL") {
    conditions.push(eq(deposits.status, input.status));
  }
  if (input.search?.trim()) {
    const term = `%${input.search.trim()}%`;
    conditions.push(
      or(
        ilike(users.email, term),
        ilike(deposits.senderTransactionId, term),
        ilike(deposits.senderName, term),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      deposit: deposits,
      userEmail: users.email,
      paymentAccountName: platformPaymentAccounts.accountName,
      paymentBankName: platformPaymentAccounts.bankName,
      paymentAccountNumber: platformPaymentAccounts.accountNumber,
    })
    .from(deposits)
    .innerJoin(users, eq(deposits.userId, users.id))
    .leftJoin(
      platformPaymentAccounts,
      eq(deposits.paymentAccountId, platformPaymentAccounts.id),
    )
    .where(where)
    .orderBy(desc(deposits.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(deposits)
    .innerJoin(users, eq(deposits.userId, users.id))
    .where(where);

  return {
    items: rows.map((r) => ({
      id: r.deposit.id,
      userId: r.deposit.userId,
      userEmail: r.userEmail,
      amount: r.deposit.amount,
      currency: r.deposit.currency,
      status: r.deposit.status,
      provider: r.deposit.provider,
      providerRef: r.deposit.providerRef,
      senderTransactionId: r.deposit.senderTransactionId,
      senderName: r.deposit.senderName,
      receiptUrl: r.deposit.receiptUrl,
      receiptKey: r.deposit.receiptKey,
      paymentAccountId: r.deposit.paymentAccountId,
      paymentBankName: r.paymentBankName,
      paymentAccountName: r.paymentAccountName,
      paymentAccountNumber: r.paymentAccountNumber,
      failureReason: r.deposit.failureReason,
      adminNotes: r.deposit.adminNotes,
      approvedAt: r.deposit.approvedAt,
      createdAt: r.deposit.createdAt,
      updatedAt: r.deposit.updatedAt,
    })),
    total: countRow?.n ?? 0,
    limit,
    offset,
  };
}

export async function getAdminDeposit(adminId: string, id: string) {
  await requireAnyAdminPermission(adminId, [
    "deposits.read",
    "deposits.approve",
    "deposits.reject",
  ]);
  const db = getDb();
  const [row] = await db
    .select({
      deposit: deposits,
      userEmail: users.email,
      userFirstName: userProfiles.firstName,
      userLastName: userProfiles.lastName,
      paymentAccountLabel: platformPaymentAccounts.label,
      paymentBankName: platformPaymentAccounts.bankName,
      paymentAccountName: platformPaymentAccounts.accountName,
      paymentAccountNumber: platformPaymentAccounts.accountNumber,
      approvedByEmail: admins.email,
    })
    .from(deposits)
    .innerJoin(users, eq(deposits.userId, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(
      platformPaymentAccounts,
      eq(deposits.paymentAccountId, platformPaymentAccounts.id),
    )
    .leftJoin(admins, eq(deposits.approvedByAdminId, admins.id))
    .where(eq(deposits.id, id))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Deposit not found.", 404);

  return {
    ...row.deposit,
    userEmail: row.userEmail,
    userName:
      row.userFirstName || row.userLastName
        ? `${row.userFirstName ?? ""} ${row.userLastName ?? ""}`.trim()
        : null,
    paymentAccount: row.deposit.paymentAccountId
      ? {
          label: row.paymentAccountLabel,
          bankName: row.paymentBankName,
          accountName: row.paymentAccountName,
          accountNumber: row.paymentAccountNumber,
        }
      : null,
    approvedByAdminEmail: row.approvedByEmail ?? null,
  };
}

export async function approveDeposit(
  adminId: string,
  id: string,
  input: { adminNotes?: string } = {},
  meta: AuditMeta = {},
) {
  await requireAnyAdminPermission(adminId, [
    "deposits.approve",
    "deposits.read",
  ]);
  const db = getDb();

  const [deposit] = await db
    .select()
    .from(deposits)
    .where(eq(deposits.id, id))
    .limit(1);

  if (!deposit) {
    throw new AppError("NOT_FOUND", "Deposit not found.", 404);
  }

  if (deposit.status === "SUCCESS") {
    throw new AppError(
      "INVALID_STATE",
      "Deposit is already approved and credited.",
      400,
    );
  }

  if (deposit.status === "FAILED") {
    throw new AppError(
      "INVALID_STATE",
      "Cannot approve a failed/rejected deposit.",
      400,
    );
  }

  const { transaction } = await postLedgerEntry({
    userId: deposit.userId,
    accountCode: "AVAILABLE",
    amount: deposit.amount,
    entryType: "DEPOSIT_CREDIT",
    referenceType: "deposit",
    referenceId: deposit.id,
    description: `Manual Bank Deposit Verified: ${deposit.senderTransactionId || deposit.id}`,
    walletTx: {
      type: "DEPOSIT",
      status: "COMPLETED",
      direction: "CREDIT",
      amount: deposit.amount,
    },
  });

  const [updated] = await db
    .update(deposits)
    .set({
      status: "SUCCESS",
      walletTransactionId: transaction?.id ?? null,
      approvedByAdminId: adminId,
      approvedAt: new Date(),
      adminNotes: input.adminNotes ?? deposit.adminNotes,
      failureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(deposits.id, id))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "DEPOSIT_APPROVED",
    entityType: "deposit",
    entityId: id,
    before: deposit,
    after: updated,
    reason: input.adminNotes ?? null,
    meta,
  });

  await safeNotify({
    userId: deposit.userId,
    code: "DEPOSIT_COMPLETED",
    vars: {
      amount: deposit.amount,
      currency: deposit.currency,
    },
    data: { depositId: id, transactionId: deposit.senderTransactionId },
  });

  return updated!;
}

export async function rejectDeposit(
  adminId: string,
  id: string,
  input: { reason: string; adminNotes?: string },
  meta: AuditMeta = {},
) {
  await requireAnyAdminPermission(adminId, [
    "deposits.reject",
    "deposits.read",
  ]);
  const db = getDb();

  const [deposit] = await db
    .select()
    .from(deposits)
    .where(eq(deposits.id, id))
    .limit(1);

  if (!deposit) {
    throw new AppError("NOT_FOUND", "Deposit not found.", 404);
  }

  if (deposit.status === "SUCCESS") {
    throw new AppError(
      "INVALID_STATE",
      "Cannot reject a deposit that has already been credited.",
      400,
    );
  }

  const [updated] = await db
    .update(deposits)
    .set({
      status: "FAILED",
      failureReason: input.reason || "Rejected by administrator",
      adminNotes: input.adminNotes ?? deposit.adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(deposits.id, id))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "DEPOSIT_REJECTED",
    entityType: "deposit",
    entityId: id,
    before: deposit,
    after: updated,
    reason: input.reason,
    meta,
  });

  return updated!;
}
