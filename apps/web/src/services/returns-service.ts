import { and, desc, eq } from "drizzle-orm";
import {
  investmentPackages,
  investments,
  projects,
} from "@solar/database/schema";
import {
  buildReturnSeries,
  calculateInvestmentReturn,
  calculateTodayReturn,
} from "@/calculations/investment-return";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { getSettingNumber } from "@/settings/settings";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getReturnsSummary(userId: string, now = new Date()) {
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

  let principal = 0;
  let accruedReturn = 0;
  let expectedReturn = 0;
  let maturityValue = 0;
  let currentValue = 0;
  let todayReturn = 0;

  const items = rows.map(({ inv, packageName, projectName }) => {
    const calc = calculateInvestmentReturn({
      principal: inv.principal,
      returnRate: inv.returnRate,
      returnType: inv.returnType,
      startAt: inv.startAt,
      maturityAt: inv.maturityAt,
      currentTime: now,
    });
    const dayReturn = calculateTodayReturn(
      {
        principal: inv.principal,
        returnRate: inv.returnRate,
        returnType: inv.returnType,
        startAt: inv.startAt,
        maturityAt: inv.maturityAt,
      },
      now,
    );

    principal += inv.principal;
    accruedReturn += calc.accruedReturn;
    expectedReturn += calc.expectedReturn;
    maturityValue += calc.maturityValue;
    currentValue += calc.currentValue;
    todayReturn += dayReturn;

    return {
      id: inv.id,
      status: inv.status,
      packageName,
      projectName,
      principal: inv.principal,
      accruedReturn: calc.accruedReturn,
      expectedReturn: calc.expectedReturn,
      maturityValue: calc.maturityValue,
      currentValue: calc.currentValue,
      todayReturn: dayReturn,
      percentageComplete: calc.percentageComplete,
      isMature: calc.isMature,
      startAt: inv.startAt,
      maturityAt: inv.maturityAt,
    };
  });

  return {
    asOf: now.toISOString(),
    totals: {
      principal: roundMoney(principal),
      accruedReturn: roundMoney(accruedReturn),
      expectedReturn: roundMoney(expectedReturn),
      maturityValue: roundMoney(maturityValue),
      currentValue: roundMoney(currentValue),
      todayReturn: roundMoney(todayReturn),
      investmentCount: items.length,
    },
    items,
  };
}

export async function getInvestmentReturnDetail(
  userId: string,
  id: string,
  now = new Date(),
) {
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

  if (!row) {
    throw new AppError("NOT_FOUND", "Investment not found.", 404);
  }

  const input = {
    principal: row.inv.principal,
    returnRate: row.inv.returnRate,
    returnType: row.inv.returnType,
    startAt: row.inv.startAt,
    maturityAt: row.inv.maturityAt,
  };

  const calc = calculateInvestmentReturn({ ...input, currentTime: now });
  const todayReturn = calculateTodayReturn(input, now);
  const pointCount = await getSettingNumber("returns.series_point_count", 24);
  const series = buildReturnSeries({ ...input, currentTime: now }, pointCount);

  return {
    investmentId: row.inv.id,
    packageName: row.packageName,
    projectName: row.projectName,
    principal: row.inv.principal,
    status: row.inv.status,
    startAt: row.inv.startAt,
    maturityAt: row.inv.maturityAt,
    ...calc,
    todayReturn,
    series,
  };
}
