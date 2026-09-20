import { and, eq, sql } from "drizzle-orm";
import {
  investmentLots,
  investmentPackages,
  investments,
  ledgerAccounts,
  ledgerEntries,
  packageVersions,
  users,
  walletTransactions,
  wallets,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { availableLots } from "@/services/admin-package-service";
import { quoteInvestment } from "@/services/marketplace-service";

function isWithinWindow(pkg: {
  availableFrom: Date | null;
  availableUntil: Date | null;
}) {
  const now = new Date();
  if (pkg.availableFrom && pkg.availableFrom > now) return false;
  if (pkg.availableUntil && pkg.availableUntil < now) return false;
  return true;
}

export async function purchasePackage(input: {
  userId: string;
  packageId: string;
  lotCount: number;
  idempotencyKey?: string | null;
}) {
  const { userId, packageId, lotCount, idempotencyKey } = input;

  if (!Number.isInteger(lotCount) || lotCount < 1) {
    throw new AppError("VALIDATION_ERROR", "lotCount must be a positive integer.", 400);
  }

  const db = getDb();

  if (idempotencyKey) {
    const [existing] = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.userId, userId),
          eq(investments.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      return { investment: existing, replayed: true as const };
    }
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);
  if (user.status !== "KYC_APPROVED") {
    throw new AppError(
      "KYC_REQUIRED",
      "Complete identity verification before investing.",
      403,
    );
  }

  return db.transaction(async (tx) => {
    if (idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(investments)
        .where(
          and(
            eq(investments.userId, userId),
            eq(investments.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) {
        return { investment: existing, replayed: true as const };
      }
    }

    const [pkg] = await tx
      .select()
      .from(investmentPackages)
      .where(eq(investmentPackages.id, packageId))
      .for("update");

    if (!pkg) throw new AppError("NOT_FOUND", "Package not found.", 404);
    if (pkg.status !== "OPEN") {
      throw new AppError("INVALID_STATE", "Package is not open for investment.", 400);
    }
    if (!isWithinWindow(pkg)) {
      throw new AppError(
        "INVALID_STATE",
        "Package is outside its availability window.",
        400,
      );
    }

    const available = availableLots(pkg);
    if (lotCount < pkg.minimumLots) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Minimum lots is ${pkg.minimumLots}.`,
        400,
      );
    }
    if (pkg.maximumLots != null && lotCount > pkg.maximumLots) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Maximum lots is ${pkg.maximumLots}.`,
        400,
      );
    }
    if (lotCount > available) {
      throw new AppError(
        "INVALID_STATE",
        `Only ${available} lots available.`,
        400,
      );
    }

    let version: typeof packageVersions.$inferSelect | null = null;
    if (pkg.currentVersionId) {
      const [v] = await tx
        .select()
        .from(packageVersions)
        .where(eq(packageVersions.id, pkg.currentVersionId))
        .limit(1);
      version = v ?? null;
    }
    if (!version) {
      throw new AppError(
        "INVALID_STATE",
        "Package has no published version terms.",
        400,
      );
    }

    const lotPrice = version.lotPrice;
    const quote = quoteInvestment({
      lotCount,
      lotPrice,
      returnRate: version.returnRate,
      durationDays: version.durationDays,
    });
    const principal = Math.round(quote.principal);
    if (principal < 1) {
      throw new AppError("VALIDATION_ERROR", "Principal must be at least 1.", 400);
    }

    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);
    if (!wallet) {
      throw new AppError(
        "INVALID_STATE",
        "Wallet not found. Deposit funds first.",
        400,
      );
    }

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
      throw new AppError("INTERNAL_ERROR", "AVAILABLE ledger account missing.", 500);
    }

    const [bal] = await tx
      .select({
        balance: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.ledgerAccountId, availableAccount.id));

    const balance = bal?.balance ?? 0;
    if (balance < principal) {
      throw new AppError(
        "INVALID_STATE",
        "Insufficient available wallet balance.",
        400,
      );
    }

    const startAt = new Date(quote.startAt);
    const maturityAt = new Date(quote.maturityAt);

    const [investment] = await tx
      .insert(investments)
      .values({
        userId,
        packageId,
        packageVersionId: version.id,
        principal,
        lotCount,
        startAt,
        maturityAt,
        returnType: version.returnType,
        returnRate: version.returnRate,
        status: "ACTIVE",
        idempotencyKey: idempotencyKey ?? null,
      })
      .returning();

    await tx.insert(investmentLots).values({
      investmentId: investment!.id,
      packageId,
      lotCount,
      pricePerLot: lotPrice,
      totalAmount: principal,
    });

    const newSold = pkg.soldLots + lotCount;
    const newAvailable = pkg.totalLots - pkg.reservedLots - newSold;
    const nextStatus = newAvailable <= 0 ? "FULL" : pkg.status;

    await tx
      .update(investmentPackages)
      .set({
        soldLots: newSold,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(investmentPackages.id, packageId));

    await tx.insert(ledgerEntries).values({
      ledgerAccountId: availableAccount.id,
      amount: -principal,
      entryType: "INVESTMENT_DEBIT",
      referenceType: "investment",
      referenceId: investment!.id,
      description: `Investment purchase ${investment!.id}`,
    });

    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "INVESTMENT",
      status: "COMPLETED",
      direction: "DEBIT",
      amount: principal,
      currency: wallet.currency,
      referenceType: "investment",
      referenceId: investment!.id,
      description: `Investment purchase ${investment!.id}`,
    });

    return { investment: investment!, replayed: false as const };
  });
}

/** Pure helper for tests */
export function assertCanAllocateLots(input: {
  lotCount: number;
  minimumLots: number;
  maximumLots: number | null;
  available: number;
}) {
  if (input.lotCount < input.minimumLots) return "MIN";
  if (input.maximumLots != null && input.lotCount > input.maximumLots) return "MAX";
  if (input.lotCount > input.available) return "OVERSELL";
  return "OK";
}
