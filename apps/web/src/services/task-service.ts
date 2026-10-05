import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import {
  investmentPlans,
  investments,
  ledgerAccounts,
  ledgerEntries,
  taskCompletions,
  taskItems,
  walletTransactions,
  wallets,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import {
  remainingTasks,
  resolveTaskAllowance,
  utcTaskDate,
  validateTaskReview,
} from "@/lib/task-allowance";
import { safeNotify } from "@/services/notification-service";
import { ensureWallet } from "@/services/wallet-service";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function taskImageUrl(imageKey: string) {
  return `/api/media/${imageKey}`;
}

async function loadAllowance(db: Db | Tx, userId: string) {
  const rows = await db
    .select({
      dailyTaskLimit: investmentPlans.dailyTaskLimit,
      taskReward: investmentPlans.taskReward,
    })
    .from(investments)
    .innerJoin(
      investmentPlans,
      eq(investments.planId, investmentPlans.id),
    )
    .where(
      and(eq(investments.userId, userId), eq(investments.status, "ACTIVE")),
    );
  return resolveTaskAllowance(
    rows.map((r) => ({
      dailyTaskLimit: Number(r.dailyTaskLimit) || 0,
      taskReward: Number(r.taskReward) || 0,
    })),
  );
}

async function todayStats(db: Db | Tx, userId: string, taskDate: string) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
      earned: sql<number>`coalesce(sum(${taskCompletions.rewardAmount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(taskCompletions)
    .where(
      and(
        eq(taskCompletions.userId, userId),
        eq(taskCompletions.taskDate, taskDate),
      ),
    );
  return { completedToday: row?.count ?? 0, earnedToday: row?.earned ?? 0 };
}

export async function getTasksToday(
  userId: string,
  opts: { category?: string | null; now?: Date } = {},
) {
  const db = getDb();
  const taskDate = utcTaskDate(opts.now);
  const [allowance, stats, published, doneRows] = await Promise.all([
    loadAllowance(db, userId),
    todayStats(db, userId, taskDate),
    db
      .select()
      .from(taskItems)
      .where(eq(taskItems.status, "PUBLISHED"))
      .orderBy(asc(taskItems.sortOrder), desc(taskItems.createdAt)),
    db
      .select({ taskItemId: taskCompletions.taskItemId })
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.userId, userId),
          eq(taskCompletions.taskDate, taskDate),
        ),
      ),
  ]);
  const done = new Set(doneRows.map((r) => r.taskItemId));
  const categories = [...new Set(published.map((i) => i.category))].sort();
  const category = opts.category?.trim();
  const items = published
    .filter((i) => !category || i.category === category)
    .map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      description: i.description,
      imageUrl: taskImageUrl(i.imageKey),
      completedToday: done.has(i.id),
    }));

  return {
    eligible: allowance.eligible,
    reason: allowance.reason,
    dailyLimit: allowance.dailyLimit,
    completedToday: stats.completedToday,
    remaining: allowance.eligible
      ? remainingTasks(allowance.dailyLimit, stats.completedToday)
      : 0,
    rewardPerTask: allowance.rewardPerTask,
    earnedToday: stats.earnedToday,
    currency: "NGN",
    categories,
    items,
  };
}

export async function getTaskItemForUser(
  userId: string,
  itemId: string,
  now: Date = new Date(),
) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(taskItems)
    .where(and(eq(taskItems.id, itemId), eq(taskItems.status, "PUBLISHED")))
    .limit(1);
  if (!item) throw new AppError("NOT_FOUND", "Task not found.", 404);
  const [done] = await db
    .select({ id: taskCompletions.id })
    .from(taskCompletions)
    .where(
      and(
        eq(taskCompletions.userId, userId),
        eq(taskCompletions.taskItemId, itemId),
        eq(taskCompletions.taskDate, utcTaskDate(now)),
      ),
    )
    .limit(1);
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description,
    imageUrl: taskImageUrl(item.imageKey),
    completedToday: Boolean(done),
  };
}

function isUniqueViolation(err: unknown) {
  const code = (err as { code?: string } | null)?.code;
  const causeCode = (err as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "23505" || causeCode === "23505";
}

export async function completeTask(input: {
  userId: string;
  taskItemId: string;
  stars: unknown;
  comment: unknown;
  now?: Date;
}) {
  const review = validateTaskReview(input);
  if (!review.ok) throw new AppError("VALIDATION_ERROR", review.message, 400);

  const now = input.now ?? new Date();
  const taskDate = utcTaskDate(now);
  await ensureWallet(input.userId);
  const db = getDb();

  let result;
  try {
    result = await db.transaction(async (tx) => {
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, input.userId))
        .limit(1)
        .for("update");
      if (!wallet) throw new AppError("INTERNAL_ERROR", "Wallet missing.", 500);

      const allowance = await loadAllowance(tx, input.userId);
      if (!allowance.eligible) {
        throw new AppError(
          "TASKS_NOT_ELIGIBLE",
          allowance.reason === "NO_TASKS_FOR_PACKAGE"
            ? "Your current plan does not include daily tasks."
            : "Invest in a plan to unlock daily tasks.",
          403,
        );
      }

      const stats = await todayStats(tx, input.userId, taskDate);
      if (remainingTasks(allowance.dailyLimit, stats.completedToday) <= 0) {
        throw new AppError(
          "TASK_LIMIT_REACHED",
          "You have completed all your tasks for today.",
          409,
        );
      }

      const [item] = await tx
        .select()
        .from(taskItems)
        .where(
          and(
            eq(taskItems.id, input.taskItemId),
            eq(taskItems.status, "PUBLISHED"),
          ),
        )
        .limit(1);
      if (!item) throw new AppError("NOT_FOUND", "Task not found.", 404);

      const [already] = await tx
        .select({ id: taskCompletions.id })
        .from(taskCompletions)
        .where(
          and(
            eq(taskCompletions.userId, input.userId),
            eq(taskCompletions.taskItemId, item.id),
            eq(taskCompletions.taskDate, taskDate),
          ),
        )
        .limit(1);
      if (already) {
        throw new AppError(
          "TASK_ALREADY_COMPLETED",
          "You already reviewed this item today.",
          409,
        );
      }

      const [available] = await tx
        .select()
        .from(ledgerAccounts)
        .where(
          and(
            eq(ledgerAccounts.walletId, wallet.id),
            eq(ledgerAccounts.code, "AVAILABLE"),
          ),
        )
        .limit(1);
      if (!available) {
        throw new AppError("INTERNAL_ERROR", "AVAILABLE ledger missing.", 500);
      }

      const reward = allowance.rewardPerTask;
      const description = `Task reward: ${item.title}`;
      let walletTxId: string | null = null;
      if (reward > 0) {
        const [wtx] = await tx
          .insert(walletTransactions)
          .values({
            walletId: wallet.id,
            type: "TASK_REWARD",
            status: "COMPLETED",
            direction: "CREDIT",
            amount: reward,
            currency: wallet.currency,
            referenceType: "task_item",
            referenceId: item.id,
            description,
          })
          .returning();
        walletTxId = wtx!.id;
        await tx.insert(ledgerEntries).values({
          ledgerAccountId: available.id,
          amount: reward,
          entryType: "TASK_REWARD_CREDIT",
          referenceType: "wallet_transaction",
          referenceId: wtx!.id,
          description,
        });
      }

      const [createdComp] = await tx
        .insert(taskCompletions)
        .values({
          userId: input.userId,
          taskItemId: item.id,
          stars: review.stars,
          comment: review.comment,
          rewardAmount: reward,
          taskDate,
          walletTransactionId: walletTxId,
        })
        .returning();

      const [bal] = await tx
        .select({
          balance: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)`.mapWith(
            Number,
          ),
        })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.ledgerAccountId, available.id));

      const completedToday = stats.completedToday + 1;
      return {
        completionId: createdComp?.id,
        itemTitle: item.title,
        completedToday,
        remaining: remainingTasks(allowance.dailyLimit, completedToday),
        dailyLimit: allowance.dailyLimit,
        rewardPerTask: reward,
        rewardEarned: reward,
        earnedToday: stats.earnedToday + reward,
        availableBalance: bal?.balance ?? 0,
        currency: wallet.currency,
      };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(
        "TASK_ALREADY_COMPLETED",
        "You already reviewed this item today.",
        409,
      );
    }
    throw err;
  }

  if (result.rewardEarned > 0) {
    await safeNotify({
      userId: input.userId,
      code: "TASK_REWARD",
      vars: { amount: result.rewardEarned, itemTitle: result.itemTitle },
    });
  }

  return result;
}

export async function listTaskHistory(
  userId: string,
  opts: { limit?: number; before?: string | null } = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const db = getDb();
  const conditions = [eq(taskCompletions.userId, userId)];
  if (opts.before) {
    const before = new Date(opts.before);
    if (Number.isNaN(before.getTime())) {
      throw new AppError("VALIDATION_ERROR", "Invalid cursor.", 400);
    }
    conditions.push(lt(taskCompletions.createdAt, before));
  }
  const rows = await db
    .select({
      id: taskCompletions.id,
      stars: taskCompletions.stars,
      comment: taskCompletions.comment,
      rewardAmount: taskCompletions.rewardAmount,
      taskDate: taskCompletions.taskDate,
      createdAt: taskCompletions.createdAt,
      itemTitle: taskItems.title,
      itemCategory: taskItems.category,
      imageKey: taskItems.imageKey,
    })
    .from(taskCompletions)
    .innerJoin(taskItems, eq(taskCompletions.taskItemId, taskItems.id))
    .where(and(...conditions))
    .orderBy(desc(taskCompletions.createdAt))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return {
    items: page.map(({ imageKey, ...r }) => ({
      ...r,
      imageUrl: taskImageUrl(imageKey),
    })),
    nextCursor:
      rows.length > limit ? page.at(-1)!.createdAt.toISOString() : null,
  };
}
