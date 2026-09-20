import { desc, eq, sql } from "drizzle-orm";
import {
  ledgerAccounts,
  ledgerEntries,
  walletTransactions,
  wallets,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";

export function sumBalances(entries: { code: string; amount: number }[]) {
  let available = 0;
  let pending = 0;
  for (const e of entries) {
    if (e.code === "AVAILABLE") available += e.amount;
    if (e.code === "PENDING") pending += e.amount;
  }
  return { availableBalance: available, pendingBalance: pending };
}

/** Ensure wallet + AVAILABLE/PENDING ledger accounts exist. */
export async function ensureWallet(userId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);
  if (existing) {
    const accounts = await db
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.walletId, existing.id));
    return { wallet: existing, accounts };
  }

  const [wallet] = await db
    .insert(wallets)
    .values({ userId, currency: "NGN" })
    .returning();

  const accounts = await db
    .insert(ledgerAccounts)
    .values([
      { walletId: wallet!.id, code: "AVAILABLE" },
      { walletId: wallet!.id, code: "PENDING" },
    ])
    .returning();

  return { wallet: wallet!, accounts };
}

export async function getAccountBalance(ledgerAccountId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      balance: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.ledgerAccountId, ledgerAccountId));
  return row?.balance ?? 0;
}

export async function getWallet(userId: string) {
  const { wallet, accounts } = await ensureWallet(userId);
  const available = accounts.find((a) => a.code === "AVAILABLE");
  const pending = accounts.find((a) => a.code === "PENDING");
  if (!available || !pending) {
    throw new AppError("INTERNAL_ERROR", "Wallet ledger accounts missing.", 500);
  }
  const [availableBalance, pendingBalance] = await Promise.all([
    getAccountBalance(available.id),
    getAccountBalance(pending.id),
  ]);
  return {
    id: wallet.id,
    currency: wallet.currency,
    availableBalance,
    pendingBalance,
    createdAt: wallet.createdAt,
  };
}

export async function listWalletTransactions(userId: string, limit = 50) {
  const { wallet } = await ensureWallet(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.walletId, wallet.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(Math.min(limit, 100));
  return rows;
}

export async function getWalletTransaction(userId: string, txId: string) {
  const { wallet } = await ensureWallet(userId);
  const db = getDb();
  const [row] = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.id, txId))
    .limit(1);
  if (!row || row.walletId !== wallet.id) {
    throw new AppError("NOT_FOUND", "Transaction not found.", 404);
  }
  return row;
}

/**
 * Internal helper for later chunks (deposits/purchases).
 * Credits/debits a single ledger account and optionally records a wallet_transaction.
 */
export async function postLedgerEntry(input: {
  userId: string;
  accountCode: "AVAILABLE" | "PENDING";
  amount: number;
  entryType: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  walletTx?: {
    type: string;
    status: string;
    direction: "CREDIT" | "DEBIT";
    amount: number;
  };
}) {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new AppError("VALIDATION_ERROR", "amount must be a non-zero integer.", 400);
  }
  const { wallet, accounts } = await ensureWallet(input.userId);
  const account = accounts.find((a) => a.code === input.accountCode);
  if (!account) {
    throw new AppError("INTERNAL_ERROR", "Ledger account missing.", 500);
  }
  const db = getDb();
  const [entry] = await db
    .insert(ledgerEntries)
    .values({
      ledgerAccountId: account.id,
      amount: input.amount,
      entryType: input.entryType,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      description: input.description ?? null,
    })
    .returning();

  let tx = null;
  if (input.walletTx) {
    const [created] = await db
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: input.walletTx.type,
        status: input.walletTx.status,
        direction: input.walletTx.direction,
        amount: input.walletTx.amount,
        currency: wallet.currency,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        description: input.description ?? null,
      })
      .returning();
    tx = created;
  }

  return { entry, transaction: tx };
}
