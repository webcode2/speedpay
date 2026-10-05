import { asc, eq } from "drizzle-orm";
import { investmentPlans } from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { planTaskProfit } from "@/lib/daily-roi";
import { formatDuration } from "@/lib/plan-term";

export function publicPlanView(plan: typeof investmentPlans.$inferSelect) {
  const termRoi = plan.dailyRoi;
  const dailyTaskProfit = planTaskProfit(plan);
  return {
    id: plan.id,
    name: plan.name,
    planName: plan.name,
    description: plan.description,
    kind: plan.kind,
    status: plan.status,
    price: plan.price,
    termRoi,
    dailyRoi: termRoi,
    durationDays: plan.durationDays,
    durationLabel: formatDuration(plan.durationDays),
    dailyTaskLimit: plan.dailyTaskLimit,
    dailyTasks: plan.dailyTaskLimit,
    taskReward: plan.taskReward,
    perOrder: plan.taskReward,
    dailyProfit: dailyTaskProfit,
    dailyTaskProfit,
    maturityPayout: plan.price + termRoi,
    sortOrder: plan.sortOrder,
    bannerImageUrl: plan.bannerImage ? `/api/media/${plan.bannerImage}` : null,
  };
}

export async function listMarketplacePlans() {
  const db = getDb();
  const rows = await db
    .select()
    .from(investmentPlans)
    .where(eq(investmentPlans.status, "OPEN"))
    .orderBy(asc(investmentPlans.sortOrder), asc(investmentPlans.price));
  return rows.map(publicPlanView);
}

export async function getMarketplacePlan(id: string) {
  const db = getDb();
  const [plan] = await db
    .select()
    .from(investmentPlans)
    .where(eq(investmentPlans.id, id))
    .limit(1);
  if (!plan) throw new AppError("NOT_FOUND", "Plan not found.", 404);
  if (plan.status !== "OPEN") {
    throw new AppError("INVALID_STATE", "Plan is not open for investment.", 400);
  }
  return publicPlanView(plan);
}

export async function quoteMarketplacePlan(id: string) {
  const plan = await getMarketplacePlan(id);
  return {
    plan,
    quote: {
      principal: plan.price,
      price: plan.price,
      dailyRoi: plan.dailyRoi,
      termRoi: plan.termRoi,
      durationDays: plan.durationDays,
      durationLabel: plan.durationLabel,
      dailyProfit: plan.dailyProfit,
      dailyTasks: plan.dailyTaskLimit,
      perOrder: plan.perOrder,
      maturityPayout: plan.maturityPayout,
    },
  };
}

/** @deprecated Slot quotes are unused; subscribe uses plan.price. */
export function quoteInvestment(input: {
  slotCount: number;
  slotPrice: string;
  returnRate: string;
  durationDays: number;
  now?: Date;
}) {
  const slotPrice = Number(String(input.slotPrice).replace(/,/g, "").trim());
  const rate = Number(String(input.returnRate).replace(/%/g, "").trim());
  const principal = input.slotCount * slotPrice;
  const expectedReturn = (principal * (Number.isFinite(rate) ? rate : 0)) / 100;
  const start = input.now ?? new Date();
  const maturityAt = new Date(
    start.getTime() + input.durationDays * 24 * 60 * 60 * 1000,
  );
  return {
    slotCount: input.slotCount,
    slotPrice: input.slotPrice,
    principal,
    expectedReturn,
    maturityValue: principal + expectedReturn,
    durationDays: input.durationDays,
    startAt: start.toISOString(),
    maturityAt: maturityAt.toISOString(),
  };
}
