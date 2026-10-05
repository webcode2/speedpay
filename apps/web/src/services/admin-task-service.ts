import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { taskCompletions, taskItems, users } from "@solar/database/schema";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { utcTaskDate } from "@/lib/task-allowance";
import { adminHasPermission } from "@/permissions/check";
import { taskImageUrl } from "@/services/task-service";

export type TaskItemInput = {
  title: string;
  category: string;
  description: string;
  imageKey: string;
  sortOrder?: number;
};

async function requirePerm(adminId: string, code: string) {
  if (!(await adminHasPermission(adminId, code))) {
    throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  }
}

function clean(input: TaskItemInput) {
  const out = {
    title: input.title.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    imageKey: input.imageKey.trim(),
    sortOrder: input.sortOrder ?? 0,
  };
  if (!out.title || !out.category || !out.description) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Title, category, and description are required.",
      400,
    );
  }
  if (!out.imageKey) {
    throw new AppError("VALIDATION_ERROR", "Image is required.", 400);
  }
  if (!Number.isInteger(out.sortOrder)) {
    throw new AppError("VALIDATION_ERROR", "sortOrder must be an integer.", 400);
  }
  return out;
}

function toView(
  row: typeof taskItems.$inferSelect,
  completionsToday = 0,
) {
  return { ...row, imageUrl: taskImageUrl(row.imageKey), completionsToday };
}

export async function listTaskItems(adminId: string, status?: string) {
  await requirePerm(adminId, "tasks.read");
  const db = getDb();
  const today = utcTaskDate();
  const rows = await db
    .select({
      item: taskItems,
      completionsToday: sql<number>`count(${taskCompletions.id})`.mapWith(Number),
    })
    .from(taskItems)
    .leftJoin(
      taskCompletions,
      and(
        eq(taskCompletions.taskItemId, taskItems.id),
        eq(taskCompletions.taskDate, today),
      ),
    )
    .where(status ? eq(taskItems.status, status) : undefined)
    .groupBy(taskItems.id)
    .orderBy(asc(taskItems.sortOrder), desc(taskItems.createdAt));
  return rows.map((r) => toView(r.item, r.completionsToday));
}

export async function getTaskItem(adminId: string, id: string) {
  await requirePerm(adminId, "tasks.read");
  const [row] = await getDb()
    .select()
    .from(taskItems)
    .where(eq(taskItems.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Task item not found.", 404);
  return toView(row);
}

export async function createTaskItem(
  adminId: string,
  input: TaskItemInput,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "tasks.write");
  const values = clean(input);
  const db = getDb();
  const [row] = await db
    .insert(taskItems)
    .values({ ...values, status: "DISABLED" })
    .returning();
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "TASK_ITEM_CREATED",
    entityType: "task_item",
    entityId: row!.id,
    after: row,
    meta,
  });
  return toView(row!);
}

export async function updateTaskItem(
  adminId: string,
  id: string,
  input: TaskItemInput,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "tasks.write");
  const values = clean(input);
  const db = getDb();
  const [row] = await db
    .update(taskItems)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(taskItems.id, id))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Task item not found.", 404);
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "TASK_ITEM_UPDATED",
    entityType: "task_item",
    entityId: id,
    after: row,
    meta,
  });
  return toView(row);
}

export async function deleteTaskItem(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "tasks.write");
  const db = getDb();
  const [existing] = await db
    .select()
    .from(taskItems)
    .where(eq(taskItems.id, id))
    .limit(1);
  if (!existing) throw new AppError("NOT_FOUND", "Task item not found.", 404);

  const [used] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(taskCompletions)
    .where(eq(taskCompletions.taskItemId, id));
  if ((used?.n ?? 0) > 0) {
    throw new AppError(
      "INVALID_STATE",
      "Cannot delete a product that already has reviews. Disable it instead.",
      400,
    );
  }

  await db.delete(taskItems).where(eq(taskItems.id, id));
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "TASK_ITEM_DELETED",
    entityType: "task_item",
    entityId: id,
    before: {
      title: existing.title,
      category: existing.category,
      status: existing.status,
    },
    meta,
  });
  return { deleted: true };
}

export async function setTaskItemStatus(
  adminId: string,
  id: string,
  status: "PUBLISHED" | "DISABLED",
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "tasks.write");
  const db = getDb();
  const [row] = await db
    .update(taskItems)
    .set({ status, updatedAt: new Date() })
    .where(eq(taskItems.id, id))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Task item not found.", 404);
  await writeAdminAudit(db, {
    actorId: adminId,
    action: status === "PUBLISHED" ? "TASK_ITEM_PUBLISHED" : "TASK_ITEM_DISABLED",
    entityType: "task_item",
    entityId: id,
    after: { status },
    meta,
  });
  return toView(row);
}

export async function listTaskCompletions(
  adminId: string,
  opts: {
    userId?: string | null;
    date?: string | null;
    limit?: number;
    before?: string | null;
  } = {},
) {
  await requirePerm(adminId, "tasks.read");
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const conditions = [];
  if (opts.userId) conditions.push(eq(taskCompletions.userId, opts.userId));
  if (opts.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
      throw new AppError("VALIDATION_ERROR", "date must be YYYY-MM-DD.", 400);
    }
    conditions.push(eq(taskCompletions.taskDate, opts.date));
  }
  if (opts.before) {
    const before = new Date(opts.before);
    if (Number.isNaN(before.getTime())) {
      throw new AppError("VALIDATION_ERROR", "Invalid cursor.", 400);
    }
    conditions.push(lt(taskCompletions.createdAt, before));
  }
  const rows = await getDb()
    .select({
      id: taskCompletions.id,
      userId: taskCompletions.userId,
      userEmail: users.email,
      itemId: taskItems.id,
      itemTitle: taskItems.title,
      stars: taskCompletions.stars,
      comment: taskCompletions.comment,
      rewardAmount: taskCompletions.rewardAmount,
      taskDate: taskCompletions.taskDate,
      createdAt: taskCompletions.createdAt,
    })
    .from(taskCompletions)
    .innerJoin(users, eq(taskCompletions.userId, users.id))
    .innerJoin(taskItems, eq(taskCompletions.taskItemId, taskItems.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(taskCompletions.createdAt))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return {
    items: page,
    nextCursor:
      rows.length > limit ? page.at(-1)!.createdAt.toISOString() : null,
  };
}
