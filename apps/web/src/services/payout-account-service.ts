import { and, desc, eq, isNull } from "drizzle-orm";
import { auditLogs, payoutAccounts, users } from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";

export type PayoutAccountInput = {
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function maskAccountNumber(accountNumber: string): string {
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${"*".repeat(Math.min(trimmed.length - 4, 8))}${trimmed.slice(-4)}`;
}

export function toInvestorPayoutView(row: typeof payoutAccounts.$inferSelect) {
  return {
    id: row.id,
    bankName: row.bankName,
    accountNumberMasked: maskAccountNumber(row.accountNumber),
    accountName: row.accountName,
    isDefault: row.isDefault,
    status: row.status,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getOwnedAccount(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(payoutAccounts)
    .where(
      and(
        eq(payoutAccounts.id, id),
        eq(payoutAccounts.userId, userId),
        isNull(payoutAccounts.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Payout account not found.", 404);
  return row;
}

export async function listPayoutAccounts(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(payoutAccounts)
    .where(
      and(eq(payoutAccounts.userId, userId), isNull(payoutAccounts.deletedAt)),
    )
    .orderBy(desc(payoutAccounts.createdAt));
  return rows.map(toInvestorPayoutView);
}

export async function createPayoutAccount(
  userId: string,
  input: PayoutAccountInput,
) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);
  if (user.status !== "KYC_APPROVED") {
    throw new AppError(
      "KYC_REQUIRED",
      "Complete identity verification before adding a payout account.",
      403,
    );
  }

  const existing = await db
    .select({ id: payoutAccounts.id })
    .from(payoutAccounts)
    .where(
      and(eq(payoutAccounts.userId, userId), isNull(payoutAccounts.deletedAt)),
    )
    .limit(1);

  const [created] = await db
    .insert(payoutAccounts)
    .values({
      userId,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      isDefault: existing.length === 0,
      status: "PENDING",
    })
    .returning();

  return toInvestorPayoutView(created!);
}

export async function updatePayoutAccount(
  userId: string,
  id: string,
  input: PayoutAccountInput,
) {
  const db = getDb();
  const row = await getOwnedAccount(userId, id);
  const now = new Date();
  const resetReview = row.status === "VERIFIED";

  const [updated] = await db
    .update(payoutAccounts)
    .set({
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      status: resetReview ? "PENDING" : row.status === "REJECTED" ? "PENDING" : row.status,
      rejectionReason: resetReview || row.status === "REJECTED" ? null : row.rejectionReason,
      reviewedAt: resetReview || row.status === "REJECTED" ? null : row.reviewedAt,
      reviewedBy: resetReview || row.status === "REJECTED" ? null : row.reviewedBy,
      updatedAt: now,
    })
    .where(eq(payoutAccounts.id, id))
    .returning();

  return toInvestorPayoutView(updated!);
}

export async function setDefaultPayoutAccount(
  userId: string,
  id: string,
  meta: RequestMeta = {},
) {
  const db = getDb();
  const row = await getOwnedAccount(userId, id);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(payoutAccounts)
      .set({ isDefault: false, updatedAt: now })
      .where(
        and(eq(payoutAccounts.userId, userId), isNull(payoutAccounts.deletedAt)),
      );
    await tx
      .update(payoutAccounts)
      .set({ isDefault: true, updatedAt: now })
      .where(eq(payoutAccounts.id, id));
    await tx.insert(auditLogs).values({
      actorId: userId,
      actorType: "USER",
      action: "PAYOUT_DEFAULT_SET",
      entityType: "payout_account",
      entityId: id,
      before: { isDefault: row.isDefault },
      after: { isDefault: true },
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });
  });

  return toInvestorPayoutView({ ...row, isDefault: true, updatedAt: now });
}

export async function deletePayoutAccount(
  userId: string,
  id: string,
  meta: RequestMeta = {},
) {
  const db = getDb();
  const row = await getOwnedAccount(userId, id);
  const now = new Date();

  await db
    .update(payoutAccounts)
    .set({ deletedAt: now, isDefault: false, updatedAt: now })
    .where(eq(payoutAccounts.id, id));

  await db.insert(auditLogs).values({
    actorId: userId,
    actorType: "USER",
    action: "PAYOUT_DELETED",
    entityType: "payout_account",
    entityId: id,
    before: { status: row.status, isDefault: row.isDefault },
    after: { deletedAt: now.toISOString() },
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });

  return { id, deleted: true };
}
