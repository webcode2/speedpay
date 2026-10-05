import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import {
  investmentPlans,
  investments,
  payoutAccounts,
  taskCompletions,
  userProfiles,
  users,
  verificationRequests,
} from "@solar/database/schema";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import {
  accountReferralStatus,
  referrerStatus,
} from "@/lib/referral";
import {
  remainingTasks,
  resolveTaskAllowance,
  utcTaskDate,
} from "@/lib/task-allowance";
import {
  adminHasPermission,
  requireAdminPermission,
} from "@/permissions/check";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

export async function listAdminUsers(input: {
  adminId: string;
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  await requirePerm(input.adminId, "users.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const filters = [];
  if (input.status) filters.push(eq(users.status, input.status));
  if (input.q?.trim()) {
    filters.push(ilike(users.email, `%${input.q.trim()}%`));
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(where);

  const ids = rows.map((r) => r.id);
  const referredCounts =
    ids.length === 0
      ? []
      : await db
          .select({
            referrerId: users.referredByUserId,
            n: sql<number>`count(*)`.mapWith(Number),
          })
          .from(users)
          .where(inArray(users.referredByUserId, ids))
          .groupBy(users.referredByUserId);
  const countMap = new Map(
    referredCounts.map((r) => [r.referrerId, r.n] as const),
  );

  return {
    items: rows.map((r) => ({
      ...r,
      referredCount: countMap.get(r.id) ?? 0,
    })),
    total: countRow?.n ?? 0,
    limit,
    offset,
  };
}

export async function getAdminUser(adminId: string, userId: string) {
  await requirePerm(adminId, "users.read");
  const db = getDb();
  const [row] = await db
    .select({
      user: users,
      profile: userProfiles,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "User not found.", 404);

  const today = utcTaskDate();
  const subRows = await db
    .select({
      inv: investments,
      planName: investmentPlans.name,
      planKind: investmentPlans.kind,
      dailyTaskLimit: investmentPlans.dailyTaskLimit,
      taskReward: investmentPlans.taskReward,
    })
    .from(investments)
    .innerJoin(investmentPlans, eq(investments.planId, investmentPlans.id))
    .where(eq(investments.userId, userId))
    .orderBy(desc(investments.createdAt));

  const [taskRow] = await db
    .select({
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
    .where(eq(taskCompletions.userId, userId));

  const allowance = resolveTaskAllowance(
    subRows
      .filter((r) => r.inv.status === "ACTIVE")
      .map((r) => ({
        dailyTaskLimit: Number(r.dailyTaskLimit) || 0,
        taskReward: Number(r.taskReward) || 0,
      })),
  );
  const completedToday = taskRow?.completedToday ?? 0;

  const [kyc] = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.userId, userId))
    .orderBy(desc(verificationRequests.createdAt))
    .limit(1);
  const [payoutCount] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(payoutAccounts)
    .where(eq(payoutAccounts.userId, userId));

  const payload = {
    ...row.user,
    profile: row.profile,
    investmentCount: subRows.length,
    payoutAccountCount: payoutCount?.n ?? 0,
    latestKyc: kyc
      ? { id: kyc.id, status: kyc.status, submittedAt: kyc.submittedAt }
      : null,
    investments: subRows.map((r) => {
      return {
        id: r.inv.id,
        planId: r.inv.planId,
        planName: r.planName,
        planKind: r.planKind,
        status: r.inv.status,
        principal: r.inv.principal,
        termRoi: r.inv.dailyRoi,
        dailyRoi: r.inv.dailyRoi,
        lastRoiOn: r.inv.lastRoiOn,
        dailyTaskLimit: r.dailyTaskLimit,
        startAt: r.inv.startAt,
        maturityAt: r.inv.maturityAt,
        taskReward: r.taskReward,
      };
    }),
    tasks: {
      eligible: allowance.eligible,
      dailyLimit: allowance.dailyLimit,
      completedToday,
      remainingToday: remainingTasks(allowance.dailyLimit, completedToday),
      earnedToday: taskRow?.earnedToday ?? 0,
      lifetime: taskRow?.lifetime ?? 0,
      lifetimeEarned: taskRow?.lifetimeEarned ?? 0,
    },
    referralCode: row.user.referralCode,
    referredBy: null as { id: string; email: string } | null,
    referringStatus: "NONE" as "NONE" | "GROWING" | "ACTIVE",
    referrals: [] as {
      id: string;
      email: string;
      accountStatus: string;
      createdAt: Date;
    }[],
  };

  if (row.user.referredByUserId) {
    const [ref] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, row.user.referredByUserId))
      .limit(1);
    payload.referredBy = ref ?? null;
  }

  const downline = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.referredByUserId, userId))
    .orderBy(desc(users.createdAt));

  const subIds = new Set<string>();
  if (downline.length > 0) {
    const active = await db
      .select({ userId: investments.userId })
      .from(investments)
      .where(
        and(
          inArray(
            investments.userId,
            downline.map((d) => d.id),
          ),
          eq(investments.status, "ACTIVE"),
        ),
      );
    for (const a of active) subIds.add(a.userId);
  }

  payload.referrals = downline.map((d) => ({
    id: d.id,
    email: d.email,
    accountStatus: accountReferralStatus({
      userStatus: d.status,
      hasActiveInvestment: subIds.has(d.id),
    }),
    createdAt: d.createdAt,
  }));
  payload.referringStatus = referrerStatus(
    payload.referrals.map((r) => ({
      status: r.accountStatus as "REGISTERED" | "SUBSCRIBED" | "SUSPENDED" | "CLOSED",
    })),
  );

  return payload;
}

export async function setAdminUserStatus(
  adminId: string,
  userId: string,
  action: "disable" | "enable",
  meta: AuditMeta = {},
) {
  if (action === "disable") {
    await requireAdminPermission(adminId, "users.disable");
  } else {
    await requireAdminPermission(adminId, "users.update");
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!existing) throw new AppError("NOT_FOUND", "User not found.", 404);

  let nextStatus: string;
  let auditAction: string;

  if (action === "disable") {
    if (existing.status === "SUSPENDED" || existing.status === "CLOSED") {
      return existing;
    }
    nextStatus = "SUSPENDED";
    auditAction = "USER_DISABLED";
  } else {
    if (existing.status !== "SUSPENDED") {
      throw new AppError(
        "INVALID_STATE",
        "Only suspended users can be enabled.",
        400,
      );
    }
    const [kyc] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.userId, userId))
      .orderBy(desc(verificationRequests.createdAt))
      .limit(1);
    if (kyc?.status === "APPROVED") nextStatus = "KYC_APPROVED";
    else if (existing.emailVerifiedAt) nextStatus = "REGISTERED";
    else nextStatus = "EMAIL_UNVERIFIED";
    auditAction = "USER_ENABLED";
  }

  const [updated] = await db
    .update(users)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: auditAction,
    entityType: "user",
    entityId: userId,
    before: { status: existing.status },
    after: { status: nextStatus },
    meta,
  });

  return updated!;
}
