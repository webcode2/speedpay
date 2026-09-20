import { and, desc, eq, sql } from "drizzle-orm";
import {
  investmentLots,
  investmentPackages,
  investments,
  ledgerAccounts,
  ledgerEntries,
  maturities,
  packageVersions,
  reinvestments,
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

export function remainingReinvestable(
  maturityValue: number,
  alreadyReinvested: number,
): number {
  return Math.max(0, maturityValue - alreadyReinvested);
}

export async function listReinvestments(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(reinvestments)
    .where(eq(reinvestments.userId, userId))
    .orderBy(desc(reinvestments.createdAt))
    .limit(50);
}

export async function getReinvestPreview(userId: string, parentId: string) {
  const db = getDb();
  const [parent] = await db
    .select()
    .from(investments)
    .where(and(eq(investments.id, parentId), eq(investments.userId, userId)))
    .limit(1);
  if (!parent) throw new AppError("NOT_FOUND", "Investment not found.", 404);

  const [maturity] = await db
    .select()
    .from(maturities)
    .where(eq(maturities.investmentId, parentId))
    .limit(1);
  if (!maturity || parent.status === "ACTIVE") {
    throw new AppError(
      "INVALID_STATE",
      "Investment must be matured before reinvestment.",
      400,
    );
  }
  if (parent.status !== "MATURED" && parent.status !== "REINVESTED") {
    throw new AppError("INVALID_STATE", "Investment cannot be reinvested.", 400);
  }

  const [sumRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${reinvestments.amount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(reinvestments)
    .where(eq(reinvestments.parentInvestmentId, parentId));
  const already = sumRow?.total ?? 0;
  const remaining = remainingReinvestable(maturity.maturityValue, already);

  return {
    parentInvestmentId: parentId,
    status: parent.status,
    maturityValue: maturity.maturityValue,
    alreadyReinvested: already,
    remaining,
    canReinvest: remaining > 0 && parent.status === "MATURED",
  };
}

export async function createReinvestment(input: {
  userId: string;
  parentInvestmentId: string;
  packageId: string;
  lotCount: number;
  idempotencyKey?: string | null;
}) {
  const { userId, parentInvestmentId, packageId, lotCount, idempotencyKey } =
    input;

  if (!Number.isInteger(lotCount) || lotCount < 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      "lotCount must be a positive integer.",
      400,
    );
  }

  const db = getDb();

  if (idempotencyKey) {
    const [existing] = await db
      .select()
      .from(reinvestments)
      .where(
        and(
          eq(reinvestments.userId, userId),
          eq(reinvestments.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      const [inv] = await db
        .select()
        .from(investments)
        .where(eq(investments.id, existing.newInvestmentId))
        .limit(1);
      return {
        reinvestment: existing,
        investment: inv!,
        replayed: true as const,
      };
    }
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);
  if (user.status !== "KYC_APPROVED") {
    throw new AppError("KYC_REQUIRED", "KYC approval required.", 403);
  }

  return db.transaction(async (tx) => {
    if (idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(reinvestments)
        .where(
          and(
            eq(reinvestments.userId, userId),
            eq(reinvestments.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) {
        const [inv] = await tx
          .select()
          .from(investments)
          .where(eq(investments.id, existing.newInvestmentId))
          .limit(1);
        return {
          reinvestment: existing,
          investment: inv!,
          replayed: true as const,
        };
      }
    }

    const [parent] = await tx
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.id, parentInvestmentId),
          eq(investments.userId, userId),
        ),
      )
      .for("update");
    if (!parent) throw new AppError("NOT_FOUND", "Investment not found.", 404);
    if (parent.status !== "MATURED") {
      throw new AppError(
        "INVALID_STATE",
        "Only MATURED investments can be reinvested.",
        400,
      );
    }

    const [maturity] = await tx
      .select()
      .from(maturities)
      .where(eq(maturities.investmentId, parentInvestmentId))
      .limit(1);
    if (!maturity) {
      throw new AppError(
        "INVALID_STATE",
        "Maturity record missing for investment.",
        400,
      );
    }

    const [sumRow] = await tx
      .select({
        total: sql<number>`coalesce(sum(${reinvestments.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(reinvestments)
      .where(eq(reinvestments.parentInvestmentId, parentInvestmentId));
    const already = sumRow?.total ?? 0;
    const remaining = remainingReinvestable(maturity.maturityValue, already);
    if (remaining <= 0) {
      throw new AppError(
        "INVALID_STATE",
        "No remaining maturity value to reinvest.",
        400,
      );
    }

    const [pkg] = await tx
      .select()
      .from(investmentPackages)
      .where(eq(investmentPackages.id, packageId))
      .for("update");
    if (!pkg) throw new AppError("NOT_FOUND", "Package not found.", 404);
    if (pkg.status !== "OPEN") {
      throw new AppError("INVALID_STATE", "Package is not open.", 400);
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

    const quote = quoteInvestment({
      lotCount,
      lotPrice: version.lotPrice,
      returnRate: version.returnRate,
      durationDays: version.durationDays,
    });
    const principal = Math.round(quote.principal);
    if (principal < 1) {
      throw new AppError("VALIDATION_ERROR", "Principal must be at least 1.", 400);
    }
    if (principal > remaining) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Reinvest amount ${principal} exceeds remaining ${remaining}.`,
        400,
      );
    }

    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);
    if (!wallet) {
      throw new AppError("INVALID_STATE", "Wallet not found.", 400);
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
    const balance = bal?.balance ?? 0;
    if (balance < principal) {
      throw new AppError(
        "INSUFFICIENT_BALANCE",
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
        parentInvestmentId,
        idempotencyKey: idempotencyKey ? `reinvest:${idempotencyKey}` : null,
      })
      .returning();

    await tx.insert(investmentLots).values({
      investmentId: investment!.id,
      packageId,
      lotCount,
      pricePerLot: version.lotPrice,
      totalAmount: principal,
    });

    const newSold = pkg.soldLots + lotCount;
    const newAvailable = pkg.totalLots - pkg.reservedLots - newSold;
    await tx
      .update(investmentPackages)
      .set({
        soldLots: newSold,
        status: newAvailable <= 0 ? "FULL" : pkg.status,
        updatedAt: new Date(),
      })
      .where(eq(investmentPackages.id, packageId));

    await tx.insert(ledgerEntries).values({
      ledgerAccountId: availableAccount.id,
      amount: -principal,
      entryType: "REINVESTMENT_DEBIT",
      referenceType: "reinvestment",
      referenceId: investment!.id,
      description: `Reinvestment into ${investment!.id}`,
    });

    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "INVESTMENT",
      status: "COMPLETED",
      direction: "DEBIT",
      amount: principal,
      currency: wallet.currency,
      referenceType: "reinvestment",
      referenceId: investment!.id,
      description: `Reinvestment ${investment!.id}`,
    });

    const [reinvestment] = await tx
      .insert(reinvestments)
      .values({
        parentInvestmentId,
        newInvestmentId: investment!.id,
        userId,
        amount: principal,
        idempotencyKey: idempotencyKey ?? null,
      })
      .returning();

    const newAlready = already + principal;
    if (newAlready >= maturity.maturityValue) {
      await tx
        .update(investments)
        .set({ status: "REINVESTED", updatedAt: new Date() })
        .where(eq(investments.id, parentInvestmentId));
    }

    return {
      reinvestment: reinvestment!,
      investment: investment!,
      replayed: false as const,
    };
  });
}
