import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  investmentPlans,
  investments,
  taskCompletions,
  users,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import {
  remainingTasks,
  resolveTaskAllowance,
  utcTaskDate,
} from "@/lib/task-allowance";
import { adminHasPermission } from "@/permissions/check";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

type TaskRollup = {
  completedToday: number;
  earnedToday: number;
  lifetime: number;
  lifetimeEarned: number;
};

const emptyTasks: TaskRollup = {
  completedToday: 0,
  earnedToday: 0,
  lifetime: 0,
  lifetimeEarned: 0,
};

export async function listAdminInvestments(input: {
  adminId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  await requirePerm(input.adminId, "investments.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;
  const where = input.status
    ? eq(investments.status, input.status)
    : undefined;
  const today = utcTaskDate();

  const rows = await db
    .select({
      inv: investments,
      userEmail: users.email,
      planName: investmentPlans.name,
      planKind: investmentPlans.kind,
      planDailyTaskLimit: investmentPlans.dailyTaskLimit,
      planTaskReward: investmentPlans.taskReward,
    })
    .from(investments)
    .innerJoin(users, eq(investments.userId, users.id))
    .innerJoin(investmentPlans, eq(investments.planId, investmentPlans.id))
    .where(where)
    .orderBy(desc(investments.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(investments)
    .where(where);

  const [totalsRow] = await db
    .select({
      uniqueUsers: sql<number>`count(distinct ${investments.userId})`.mapWith(
        Number,
      ),
      active: sql<number>`count(*) filter (where ${investments.status} = 'ACTIVE')`.mapWith(
        Number,
      ),
    })
    .from(investments)
    .where(where);

  const byPlan = await db
    .select({
      planId: investments.planId,
      planName: investmentPlans.name,
      planKind: investmentPlans.kind,
      subscribers: sql<number>`count(*)`.mapWith(Number),
      active: sql<number>`count(*) filter (where ${investments.status} = 'ACTIVE')`.mapWith(
        Number,
      ),
      principal: sql<number>`coalesce(sum(${investments.principal}), 0)`.mapWith(
        Number,
      ),
    })
    .from(investments)
    .innerJoin(investmentPlans, eq(investments.planId, investmentPlans.id))
    .where(where)
    .groupBy(investments.planId, investmentPlans.name, investmentPlans.kind)
    .orderBy(desc(sql`count(*)`));

  const userIds = [...new Set(rows.map((r) => r.inv.userId))];
  const tasksByUser = new Map<string, TaskRollup>();
  const remainingByUser = new Map<string, number>();

  if (userIds.length > 0) {
    const stats = await db
      .select({
        userId: taskCompletions.userId,
        lifetime: sql<number>`count(*)`.mapWith(Number),
        lifetimeEarned: sql<number>`coalesce(sum(${taskCompletions.rewardAmount}), 0)`.mapWith(
          Number,
        ),
        completedToday: sql<number>`count(*) filter (where ${taskCompletions.taskDate} = ${today})`.mapWith(
          Number,
        ),
        earnedToday: sql<number>`coalesce(sum(${taskCompletions.rewardAmount}) filter (where ${taskCompletions.taskDate} = ${today}), 0)`.mapWith(
          Number,
        ),
      })
      .from(taskCompletions)
      .where(inArray(taskCompletions.userId, userIds))
      .groupBy(taskCompletions.userId);

    for (const row of stats) {
      tasksByUser.set(row.userId, {
        lifetime: row.lifetime,
        lifetimeEarned: row.lifetimeEarned,
        completedToday: row.completedToday,
        earnedToday: row.earnedToday,
      });
    }

    const activePlans = await db
      .select({
        userId: investments.userId,
        dailyTaskLimit: investmentPlans.dailyTaskLimit,
        taskReward: investmentPlans.taskReward,
      })
      .from(investments)
      .innerJoin(investmentPlans, eq(investments.planId, investmentPlans.id))
      .where(
        and(
          inArray(investments.userId, userIds),
          eq(investments.status, "ACTIVE"),
        ),
      );

    const plansByUser = new Map<
      string,
      { dailyTaskLimit: number; taskReward: number }[]
    >();
    for (const row of activePlans) {
      const list = plansByUser.get(row.userId) ?? [];
      list.push({
        dailyTaskLimit: Number(row.dailyTaskLimit) || 0,
        taskReward: Number(row.taskReward) || 0,
      });
      plansByUser.set(row.userId, list);
    }

    for (const userId of userIds) {
      const allowance = resolveTaskAllowance(plansByUser.get(userId) ?? []);
      const completed = tasksByUser.get(userId)?.completedToday ?? 0;
      remainingByUser.set(
        userId,
        remainingTasks(allowance.dailyLimit, completed),
      );
    }
  }

  return {
    items: rows.map((r) => {
      const tasks = tasksByUser.get(r.inv.userId) ?? emptyTasks;
      return {
        id: r.inv.id,
        userId: r.inv.userId,
        status: r.inv.status,
        principal: r.inv.principal,
        slotCount: r.inv.slotCount,
        userEmail: r.userEmail,
        planId: r.inv.planId,
        planName: r.planName,
        planKind: r.planKind,
        termRoi: r.inv.dailyRoi,
        dailyRoi: r.inv.dailyRoi,
        lastRoiOn: r.inv.lastRoiOn,
        dailyTaskLimit: r.planDailyTaskLimit,
        taskReward: r.planTaskReward,
        tasksCompletedToday: tasks.completedToday,
        tasksRemainingToday: remainingByUser.get(r.inv.userId) ?? 0,
        tasksLifetime: tasks.lifetime,
        taskEarningsLifetime: tasks.lifetimeEarned,
        startAt: r.inv.startAt,
        maturityAt: r.inv.maturityAt,
        createdAt: r.inv.createdAt,
      };
    }),
    byPlan,
    totals: {
      subscriptions: countRow?.n ?? 0,
      uniqueUsers: totalsRow?.uniqueUsers ?? 0,
      active: totalsRow?.active ?? 0,
    },
    total: countRow?.n ?? 0,
    limit,
    offset,
  };
}

export async function getAdminInvestment(adminId: string, id: string) {
  await requirePerm(adminId, "investments.read");
  const db = getDb();
  const [row] = await db
    .select({
      inv: investments,
      userEmail: users.email,
      planName: investmentPlans.name,
      planKind: investmentPlans.kind,
      planDailyTaskLimit: investmentPlans.dailyTaskLimit,
      planTaskReward: investmentPlans.taskReward,
    })
    .from(investments)
    .innerJoin(users, eq(investments.userId, users.id))
    .innerJoin(investmentPlans, eq(investments.planId, investmentPlans.id))
    .where(eq(investments.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Investment not found.", 404);
  return {
    ...row.inv,
    userEmail: row.userEmail,
    planName: row.planName,
    planKind: row.planKind,
    dailyTaskLimit: row.planDailyTaskLimit,
    taskReward: row.planTaskReward,
    termRoi: row.inv.dailyRoi,
  };
}
