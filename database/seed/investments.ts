import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { investmentPlans } from "../schema";
import * as schema from "../schema";

type Db = PostgresJsDatabase<typeof schema>;

type CatalogRow = {
  name: string;
  price: number;
  termRoi: number;
  durationDays: number;
  dailyTaskLimit: number;
  taskReward: number;
  sortOrder: number;
  description: string;
};

const OPEN_SLOT_CAP = 1_000_000;

export const INVESTMENT_CATALOG: CatalogRow[] = [
  { name: "12k", price: 12_000, termRoi: 0, durationDays: 30, dailyTaskLimit: 1, taskReward: 400, sortOrder: 10, description: "₦12,000 subscription · 1 task/day (₦400/task) · ₦400 daily earnings" },
  { name: "54k", price: 54_000, termRoi: 0, durationDays: 30, dailyTaskLimit: 2, taskReward: 900, sortOrder: 20, description: "₦54,000 subscription · 2 tasks/day (₦900/task) · ₦1,800 daily earnings" },
  { name: "89k", price: 89_000, termRoi: 0, durationDays: 60, dailyTaskLimit: 3, taskReward: 1_000, sortOrder: 30, description: "₦89,000 subscription · 3 tasks/day (₦1,000/task) · ₦3,000 daily earnings" },
  { name: "120k", price: 120_000, termRoi: 0, durationDays: 60, dailyTaskLimit: 4, taskReward: 1_000, sortOrder: 40, description: "₦120,000 subscription · 4 tasks/day (₦1,000/task) · ₦4,000 daily earnings" },
  { name: "150k", price: 150_000, termRoi: 0, durationDays: 90, dailyTaskLimit: 5, taskReward: 1_000, sortOrder: 50, description: "₦150,000 subscription · 5 tasks/day (₦1,000/task) · ₦5,000 daily earnings" },
  { name: "200k", price: 200_000, termRoi: 0, durationDays: 90, dailyTaskLimit: 5, taskReward: 1_400, sortOrder: 60, description: "₦200,000 subscription · 5 tasks/day (₦1,400/task) · ₦7,000 daily earnings" },
  { name: "300k", price: 300_000, termRoi: 0, durationDays: 120, dailyTaskLimit: 5, taskReward: 2_000, sortOrder: 70, description: "₦300,000 subscription · 5 tasks/day (₦2,000/task) · ₦10,000 daily earnings" },
  { name: "500k", price: 500_000, termRoi: 0, durationDays: 120, dailyTaskLimit: 5, taskReward: 3_400, sortOrder: 80, description: "₦500,000 subscription · 5 tasks/day (₦3,400/task) · ₦17,000 daily earnings" },
  { name: "800k", price: 800_000, termRoi: 0, durationDays: 120, dailyTaskLimit: 6, taskReward: 4_500, sortOrder: 90, description: "₦800,000 subscription · 6 tasks/day (₦4,500/task) · ₦27,000 daily earnings" },
  { name: "1m", price: 1_000_000, termRoi: 0, durationDays: 120, dailyTaskLimit: 10, taskReward: 3_400, sortOrder: 100, description: "₦1,000,000 subscription · 10 tasks/day (₦3,400/task) · ₦34,000 daily earnings" },
];

function persistence(row: CatalogRow) {
  return {
    name: row.name,
    description: row.description,
    kind: "SUBSCRIPTION",
    price: row.price,
    dailyRoi: 0,
    dailyTaskLimit: row.dailyTaskLimit,
    taskReward: row.taskReward,
    sortOrder: row.sortOrder,
    status: "OPEN" as const,
    slotPrice: String(row.price),
    totalSlots: OPEN_SLOT_CAP,
    minimumSlots: 1,
    maximumSlots: 1,
    returnType: "NONE",
    returnRate: "0",
    durationDays: row.durationDays,
    updatedAt: new Date(),
  };
}

export async function seedInvestments(db: Db) {
  let created = 0;
  let updated = 0;
  for (const row of INVESTMENT_CATALOG) {
    const [existing] = await db
      .select({ id: investmentPlans.id })
      .from(investmentPlans)
      .where(eq(investmentPlans.name, row.name))
      .limit(1);
    if (existing) {
      await db
        .update(investmentPlans)
        .set(persistence(row))
        .where(eq(investmentPlans.id, existing.id));
      updated += 1;
    } else {
      await db.insert(investmentPlans).values(persistence(row));
      created += 1;
    }
  }
  return { created, updated };
}
