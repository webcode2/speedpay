import { and, eq, sql } from "drizzle-orm";
import {
  investmentPlans,
  investments,
  ledgerAccounts,
  ledgerEntries,
  users,
  walletTransactions,
  wallets,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { addDurationDays } from "@/lib/plan-term";
import { safeNotify } from "@/services/notification-service";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function creditCommission(
  tx: Tx,
  userId: string,
  amount: number,
  investmentId: string,
  description: string,
) {
  if (amount <= 0) return;

  let [wallet] = await tx
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  if (!wallet) {
    const [w] = await tx
      .insert(wallets)
      .values({ userId, currency: "NGN" })
      .returning();
    wallet = w!;
    await tx.insert(ledgerAccounts).values([
      { walletId: wallet.id, code: "AVAILABLE" },
      { walletId: wallet.id, code: "PENDING" },
    ]);
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
    .limit(1);

  if (availableAccount) {
    await tx.insert(ledgerEntries).values({
      ledgerAccountId: availableAccount.id,
      amount,
      entryType: "REFERRAL_COMMISSION",
      referenceType: "investment",
      referenceId: investmentId,
      description,
    });

    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "COMMISSION",
      status: "COMPLETED",
      direction: "CREDIT",
      amount,
      currency: wallet.currency,
      referenceType: "investment",
      referenceId: investmentId,
      description,
    });
  }
}

import { getSettingNumber } from "@/settings/settings";

async function distributeReferralCommissions(
  tx: Tx,
  buyerUserId: string,
  principal: number,
  investmentId: string,
  planName: string,
) {
  const [buyer] = await tx
    .select({
      id: users.id,
      email: users.email,
      referredByUserId: users.referredByUserId,
    })
    .from(users)
    .where(eq(users.id, buyerUserId))
    .limit(1);

  if (!buyer?.referredByUserId) return;

  const [rateAPercent, rateBPercent, rateCPercent] = await Promise.all([
    getSettingNumber("referral.level_a_commission_percent", 10),
    getSettingNumber("referral.level_b_commission_percent", 2),
    getSettingNumber("referral.level_c_commission_percent", 1),
  ]);

  // Level A
  const [levelAUser] = await tx
    .select({
      id: users.id,
      email: users.email,
      referredByUserId: users.referredByUserId,
    })
    .from(users)
    .where(eq(users.id, buyer.referredByUserId))
    .limit(1);

  if (!levelAUser) return;
  const commA = Math.round(principal * (rateAPercent / 100));
  if (commA > 0) {
    await creditCommission(
      tx,
      levelAUser.id,
      commA,
      investmentId,
      `Level A referral commission (${rateAPercent}%) from ${buyer.email} on ${planName}`,
    );
  }

  // Level B
  if (!levelAUser.referredByUserId) return;
  const [levelBUser] = await tx
    .select({
      id: users.id,
      email: users.email,
      referredByUserId: users.referredByUserId,
    })
    .from(users)
    .where(eq(users.id, levelAUser.referredByUserId))
    .limit(1);

  if (!levelBUser) return;
  const commB = Math.round(principal * (rateBPercent / 100));
  if (commB > 0) {
    await creditCommission(
      tx,
      levelBUser.id,
      commB,
      investmentId,
      `Level B referral commission (${rateBPercent}%) from ${buyer.email} on ${planName}`,
    );
  }

  // Level C
  if (!levelBUser.referredByUserId) return;
  const [levelCUser] = await tx
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, levelBUser.referredByUserId))
    .limit(1);

  if (!levelCUser) return;
  const commC = Math.round(principal * (rateCPercent / 100));
  if (commC > 0) {
    await creditCommission(
      tx,
      levelCUser.id,
      commC,
      investmentId,
      `Level C referral commission (${rateCPercent}%) from ${buyer.email} on ${planName}`,
    );
  }
}

export async function purchasePlan(input: {
  userId: string;
  planId: string;
  slotCount?: number;
  idempotencyKey?: string | null;
}) {
  const { userId, planId, idempotencyKey } = input;
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

  return db
    .transaction(async (tx) => {
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

      const [plan] = await tx
        .select()
        .from(investmentPlans)
        .where(eq(investmentPlans.id, planId))
        .for("update");

      if (!plan) throw new AppError("NOT_FOUND", "Plan not found.", 404);
      if (plan.status !== "OPEN") {
        throw new AppError("INVALID_STATE", "Plan is not open for investment.", 400);
      }

      const principal = plan.price;
      if (!Number.isInteger(principal) || principal < 1) {
        throw new AppError("VALIDATION_ERROR", "Plan price is invalid.", 400);
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

      const startAt = new Date();
      const durationDays = Math.max(1, plan.durationDays);
      const maturityAt = addDurationDays(startAt, durationDays);
      const termRoi = plan.dailyRoi;

      const [investment] = await tx
        .insert(investments)
        .values({
          userId,
          planId,
          planVersionId: null,
          principal,
          dailyRoi: termRoi,
          lastRoiOn: null,
          slotCount: 1,
          startAt,
          maturityAt,
          returnType: "TERM_ROI",
          returnRate: String(termRoi),
          status: "ACTIVE",
          idempotencyKey: idempotencyKey ?? null,
        })
        .returning();

      await tx.insert(ledgerEntries).values({
        ledgerAccountId: availableAccount.id,
        amount: -principal,
        entryType: "INVESTMENT_DEBIT",
        referenceType: "investment",
        referenceId: investment!.id,
        description: `Investment ${plan.name}`,
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
        description: `Investment ${plan.name}`,
      });

      await distributeReferralCommissions(
        tx,
        userId,
        principal,
        investment!.id,
        plan.name,
      );

      return { investment: investment!, replayed: false as const };
    })
    .then(async (result) => {
      if (!result.replayed) {
        await safeNotify({
          userId,
          code: "INVESTMENT_CREATED",
          vars: {
            amount: result.investment.principal,
            planName: planId,
          },
          data: { investmentId: result.investment.id, planId },
        });
      }
      return result;
    });
}

/** Pure helper for tests */
export function assertCanAllocateSlots(input: {
  slotCount: number;
  minimumSlots: number;
  maximumSlots: number | null;
  available: number;
}) {
  if (input.slotCount < input.minimumSlots) return "MIN";
  if (input.maximumSlots != null && input.slotCount > input.maximumSlots) return "MAX";
  if (input.slotCount > input.available) return "OVERSELL";
  return "OK";
}
