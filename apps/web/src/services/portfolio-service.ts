import { and, desc, eq } from "drizzle-orm";
import {
  investmentPlans,
  investments,
  walletTransactions,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";

function toListItem(
  inv: typeof investments.$inferSelect,
  planName: string,
) {
  return {
    id: inv.id,
    status: inv.status,
    principal: inv.principal,
    termRoi: 0,
    dailyRoi: 0,
    lastRoiOn: inv.lastRoiOn,
    slotCount: inv.slotCount,
    returnType: inv.returnType,
    returnRate: inv.returnRate,
    startAt: inv.startAt,
    maturityAt: inv.maturityAt,
    planId: inv.planId,
    planName,
    expectedReturn: 0,
    maturityValue: inv.principal,
    currentValue: inv.principal,
    accruedReturn: 0,
    percentageComplete: 100,
    isMature: true,
    createdAt: inv.createdAt,
  };
}

export async function listInvestments(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      inv: investments,
      planName: investmentPlans.name,
    })
    .from(investments)
    .innerJoin(
      investmentPlans,
      eq(investments.planId, investmentPlans.id),
    )
    .where(eq(investments.userId, userId))
    .orderBy(desc(investments.createdAt));

  return rows.map((r) => toListItem(r.inv, r.planName));
}

export async function getInvestment(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      inv: investments,
      planName: investmentPlans.name,
    })
    .from(investments)
    .innerJoin(
      investmentPlans,
      eq(investments.planId, investmentPlans.id),
    )
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Subscription not found.", 404);

  const txs = await db
    .select()
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.referenceType, "investment"),
        eq(walletTransactions.referenceId, id),
      ),
    )
    .orderBy(desc(walletTransactions.createdAt));

  return {
    ...toListItem(row.inv, row.planName),
    lots: [],
    timeline: [
      { key: "created", label: "Purchased", at: row.inv.createdAt },
      { key: "start", label: "Start", at: row.inv.startAt },
    ],
    returns: {
      accruedReturn: 0,
      currentValue: row.inv.principal,
      expectedReturn: 0,
      maturityValue: row.inv.principal,
      percentageComplete: 100,
      isMature: true,
    },
    transactions: txs.map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      direction: t.direction,
      amount: t.amount,
      currency: t.currency,
      createdAt: t.createdAt,
    })),
  };
}
