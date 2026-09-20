import { and, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  ledgerAccounts,
  ledgerEntries,
  payoutAccounts,
  users,
  walletTransactions,
  wallets,
  withdrawals,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { ensureWallet } from "@/services/wallet-service";
import { verifyWithdrawalPin } from "@/services/withdrawal-pin-service";

const MIN_WITHDRAWAL = 100;
const BLOCKED = new Set([
  "WITHDRAWAL_RESTRICTED",
  "SUSPENDED",
  "CLOSED",
]);

function toView(row: typeof withdrawals.$inferSelect) {
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    payoutAccountId: row.payoutAccountId,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reviewedAt: row.reviewedAt,
    processedAt: row.processedAt,
  };
}

export function canSubmitWithdrawal(input: {
  userStatus: string;
  amount: number;
  availableBalance: number;
  payoutStatus: string;
}): string | null {
  if (input.userStatus !== "KYC_APPROVED") return "KYC_REQUIRED";
  if (BLOCKED.has(input.userStatus)) return "WITHDRAWAL_BLOCKED";
  if (!Number.isInteger(input.amount) || input.amount < MIN_WITHDRAWAL) {
    return "INVALID_AMOUNT";
  }
  if (input.amount > input.availableBalance) return "INSUFFICIENT_BALANCE";
  if (input.payoutStatus !== "VERIFIED") return "PAYOUT_NOT_VERIFIED";
  return null;
}

export async function listWithdrawals(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.userId, userId))
    .orderBy(desc(withdrawals.createdAt))
    .limit(50);
  return rows.map(toView);
}

export async function getWithdrawal(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(withdrawals)
    .where(and(eq(withdrawals.id, id), eq(withdrawals.userId, userId)))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  return toView(row);
}

export async function createWithdrawal(input: {
  userId: string;
  amount: number;
  payoutAccountId: string;
  pin: string;
  idempotencyKey?: string;
}) {
  await verifyWithdrawalPin(input.userId, input.pin);
  const db = getDb();

  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(withdrawals)
      .where(
        and(
          eq(withdrawals.userId, input.userId),
          eq(withdrawals.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      return { withdrawal: toView(existing), replayed: true as const };
    }
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);

  const [account] = await db
    .select()
    .from(payoutAccounts)
    .where(
      and(
        eq(payoutAccounts.id, input.payoutAccountId),
        eq(payoutAccounts.userId, input.userId),
      ),
    )
    .limit(1);
  if (!account || account.deletedAt) {
    throw new AppError("NOT_FOUND", "Payout account not found.", 404);
  }

  await ensureWallet(input.userId);
  const withdrawalId = randomUUID();

  const withdrawal = await db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, input.userId))
      .limit(1);
    if (!wallet) throw new AppError("INTERNAL_ERROR", "Wallet missing.", 500);

    const [availableAccount] = await tx
      .select()
      .from(ledgerAccounts)
      .where(
        and(
          eq(ledgerAccounts.walletId, wallet.id),
          eq(ledgerAccounts.code, "AVAILABLE"),
        ),
      )
      .for("update");
    if (!availableAccount) {
      throw new AppError("INTERNAL_ERROR", "AVAILABLE ledger missing.", 500);
    }

    const [bal] = await tx
      .select({
        balance: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.ledgerAccountId, availableAccount.id));

    const availableBalance = bal?.balance ?? 0;
    const gate = canSubmitWithdrawal({
      userStatus: user.status,
      amount: input.amount,
      availableBalance,
      payoutStatus: account.status,
    });
    if (gate === "KYC_REQUIRED") {
      throw new AppError("KYC_REQUIRED", "KYC approval required.", 403);
    }
    if (gate === "WITHDRAWAL_BLOCKED") {
      throw new AppError(
        "FORBIDDEN",
        "Withdrawals are restricted for this account.",
        403,
      );
    }
    if (gate === "INVALID_AMOUNT") {
      throw new AppError(
        "VALIDATION_ERROR",
        `amount must be an integer >= ${MIN_WITHDRAWAL}.`,
        400,
      );
    }
    if (gate === "INSUFFICIENT_BALANCE") {
      throw new AppError(
        "INSUFFICIENT_BALANCE",
        "Insufficient available balance.",
        400,
      );
    }
    if (gate === "PAYOUT_NOT_VERIFIED") {
      throw new AppError(
        "INVALID_STATE",
        "Payout account must be VERIFIED.",
        400,
      );
    }

    const [txRow] = await tx
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: "WITHDRAWAL",
        status: "PENDING",
        direction: "DEBIT",
        amount: input.amount,
        currency: wallet.currency,
        referenceType: "withdrawal",
        referenceId: withdrawalId,
        description: `Withdrawal ${withdrawalId}`,
      })
      .returning();

    await tx.insert(ledgerEntries).values({
      ledgerAccountId: availableAccount.id,
      amount: -input.amount,
      entryType: "WITHDRAWAL_HOLD",
      referenceType: "withdrawal",
      referenceId: withdrawalId,
      description: `Withdrawal hold ${withdrawalId}`,
    });

    const [created] = await tx
      .insert(withdrawals)
      .values({
        id: withdrawalId,
        userId: input.userId,
        payoutAccountId: input.payoutAccountId,
        amount: input.amount,
        currency: wallet.currency,
        status: "PENDING",
        idempotencyKey: input.idempotencyKey ?? null,
        walletTransactionId: txRow!.id,
      })
      .returning();

    return created!;
  });

  return { withdrawal: toView(withdrawal), replayed: false as const };
}

export async function restoreAvailable(row: typeof withdrawals.$inferSelect) {
  const db = getDb();
  await ensureWallet(row.userId);
  await db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, row.userId))
      .limit(1);
    if (!wallet) throw new AppError("INTERNAL_ERROR", "Wallet missing.", 500);
    const [availableAccount] = await tx
      .select()
      .from(ledgerAccounts)
      .where(
        and(
          eq(ledgerAccounts.walletId, wallet.id),
          eq(ledgerAccounts.code, "AVAILABLE"),
        ),
      )
      .for("update");
    if (!availableAccount) {
      throw new AppError("INTERNAL_ERROR", "AVAILABLE ledger missing.", 500);
    }
    await tx.insert(ledgerEntries).values({
      ledgerAccountId: availableAccount.id,
      amount: row.amount,
      entryType: "WITHDRAWAL_RELEASE",
      referenceType: "withdrawal",
      referenceId: row.id,
      description: `Withdrawal release ${row.id}`,
    });
  });
}

export async function cancelWithdrawal(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(withdrawals)
    .where(and(eq(withdrawals.id, id), eq(withdrawals.userId, userId)))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Withdrawal not found.", 404);
  if (row.status !== "PENDING") {
    throw new AppError(
      "INVALID_STATE",
      "Only PENDING withdrawals can be cancelled.",
      400,
    );
  }

  await restoreAvailable(row);
  const [updated] = await db
    .update(withdrawals)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(withdrawals.id, id))
    .returning();

  if (row.walletTransactionId) {
    await db
      .update(walletTransactions)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(walletTransactions.id, row.walletTransactionId));
  }

  return toView(updated!);
}
