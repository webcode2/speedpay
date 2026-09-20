import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  notificationTemplates,
  notifications,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { logger } from "@/lib/logger";
import { getSettingBool } from "@/settings/settings";

export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export async function notifyUser(input: {
  userId: string;
  code: string;
  vars?: Record<string, string | number>;
  data?: Record<string, unknown>;
}) {
  const enabled = await getSettingBool("notifications.enabled", true);
  if (!enabled) return null;

  const db = getDb();
  const [tpl] = await db
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.code, input.code))
    .limit(1);

  const vars = input.vars ?? {};
  const title = tpl
    ? renderTemplate(tpl.title, vars)
    : input.code.replace(/_/g, " ");
  const body = tpl
    ? renderTemplate(tpl.body, vars)
    : Object.entries(vars)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ") || input.code;

  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      templateCode: input.code,
      title,
      body,
      data: input.data ?? null,
    })
    .returning();
  return row!;
}

/** Best-effort notify; never throws to callers. */
export async function safeNotify(
  input: Parameters<typeof notifyUser>[0],
): Promise<void> {
  try {
    await notifyUser(input);
  } catch (err) {
    logger.error("notify.failed", {
      code: input.code,
      userId: input.userId,
      reason: err instanceof Error ? err.message : "unknown",
    });
  }
}

export async function listNotifications(userId: string, limit = 50) {
  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(Math.min(limit, 100));

  const [unread] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );

  return {
    items: rows,
    unreadCount: unread?.count ?? 0,
  };
}

export async function markNotificationRead(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Notification not found.", 404);
  if (row.readAt) return row;
  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.id, id))
    .returning();
  return updated!;
}

export async function markAllNotificationsRead(userId: string) {
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return { ok: true };
}
