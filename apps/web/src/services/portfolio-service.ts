import { and, desc, eq } from "drizzle-orm";
import {
  investmentLots,
  investmentPackages,
  investments,
  projects,
  walletTransactions,
} from "@solar/database/schema";
import { calculateInvestmentReturn } from "@/calculations/investment-return";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";

function toListItem(
  inv: typeof investments.$inferSelect,
  packageName: string,
  projectName: string,
) {
  const calc = calculateInvestmentReturn({
    principal: inv.principal,
    returnRate: inv.returnRate,
    returnType: inv.returnType,
    startAt: inv.startAt,
    maturityAt: inv.maturityAt,
  });
  return {
    id: inv.id,
    status: inv.status,
    principal: inv.principal,
    lotCount: inv.lotCount,
    returnType: inv.returnType,
    returnRate: inv.returnRate,
    startAt: inv.startAt,
    maturityAt: inv.maturityAt,
    packageId: inv.packageId,
    packageName,
    projectName,
    expectedReturn: calc.expectedReturn,
    maturityValue: calc.maturityValue,
    currentValue: calc.currentValue,
    accruedReturn: calc.accruedReturn,
    percentageComplete: calc.percentageComplete,
    isMature: calc.isMature,
    createdAt: inv.createdAt,
  };
}

export async function listInvestments(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      inv: investments,
      packageName: investmentPackages.name,
      projectName: projects.name,
    })
    .from(investments)
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .where(eq(investments.userId, userId))
    .orderBy(desc(investments.createdAt));

  return rows.map((r) => toListItem(r.inv, r.packageName, r.projectName));
}

export async function getInvestment(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      inv: investments,
      packageName: investmentPackages.name,
      projectName: projects.name,
    })
    .from(investments)
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Investment not found.", 404);

  const lots = await db
    .select()
    .from(investmentLots)
    .where(eq(investmentLots.investmentId, id));

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

  const returns = calculateInvestmentReturn({
    principal: row.inv.principal,
    returnRate: row.inv.returnRate,
    returnType: row.inv.returnType,
    startAt: row.inv.startAt,
    maturityAt: row.inv.maturityAt,
  });

  return {
    ...toListItem(row.inv, row.packageName, row.projectName),
    lots: lots.map((l) => ({
      id: l.id,
      lotCount: l.lotCount,
      pricePerLot: l.pricePerLot,
      totalAmount: l.totalAmount,
      createdAt: l.createdAt,
    })),
    timeline: [
      { key: "created", label: "Purchased", at: row.inv.createdAt },
      { key: "start", label: "Start", at: row.inv.startAt },
      { key: "maturity", label: "Maturity", at: row.inv.maturityAt },
    ],
    returns,
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
