import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { investments, users } from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import {
  accountReferralStatus,
  referrerStatus,
} from "@/lib/referral";
import { adminHasPermission } from "@/permissions/check";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

async function activeInvestmentUserIds(userIds: string[]) {
  if (userIds.length === 0) return new Set<string>();
  const rows = await getDb()
    .select({ userId: investments.userId })
    .from(investments)
    .where(
      and(
        inArray(investments.userId, userIds),
        eq(investments.status, "ACTIVE"),
      ),
    );
  return new Set(rows.map((r) => r.userId));
}

export async function listAdminReferrals(input: {
  adminId: string;
  limit?: number;
  offset?: number;
}) {
  await requirePerm(input.adminId, "users.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const referredUsers = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
      referredByUserId: users.referredByUserId,
    })
    .from(users)
    .where(isNotNull(users.referredByUserId))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const referrerIds = [
    ...new Set(
      referredUsers.map((u) => u.referredByUserId).filter(Boolean),
    ),
  ] as string[];

  const referrerUsers =
    referrerIds.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
            referralCode: users.referralCode,
          })
          .from(users)
          .where(inArray(users.id, referrerIds))
      : [];

  const referrerMap = new Map(referrerUsers.map((u) => [u.id, u]));

  const subscribed = await activeInvestmentUserIds(
    referredUsers.map((r) => r.id),
  );

  const items = referredUsers.map((row) => {
    const ref = row.referredByUserId
      ? referrerMap.get(row.referredByUserId)
      : undefined;
    return {
      referredUserId: row.id,
      referredEmail: row.email,
      accountStatus: accountReferralStatus({
        userStatus: row.status,
        hasActiveInvestment: subscribed.has(row.id),
      }),
      referredAt: row.createdAt,
      referrerUserId: ref?.id ?? row.referredByUserId ?? "",
      referrerEmail: ref?.email ?? "—",
      referrerCode: ref?.referralCode ?? "—",
    };
  });

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(isNotNull(users.referredByUserId));

  const [referrerCount] = await db
    .select({
      n: sql<number>`count(distinct ${users.referredByUserId})`.mapWith(Number),
    })
    .from(users)
    .where(isNotNull(users.referredByUserId));

  const [subscribedViaReferral] = await db
    .select({ n: sql<number>`count(distinct ${investments.userId})`.mapWith(Number) })
    .from(investments)
    .innerJoin(users, eq(investments.userId, users.id))
    .where(
      and(
        eq(investments.status, "ACTIVE"),
        isNotNull(users.referredByUserId),
      ),
    );

  return {
    items,
    total: countRow?.n ?? 0,
    referrers: referrerCount?.n ?? 0,
    subscribedViaReferral: subscribedViaReferral?.n ?? 0,
    limit,
    offset,
  };
}

export async function getAdminReferralSummary(adminId: string) {
  const list = await listAdminReferrals({ adminId, limit: 8, offset: 0 });
  return {
    referredAccounts: list.total,
    referrers: list.referrers,
    subscribedViaReferral: list.subscribedViaReferral,
    recent: list.items,
  };
}

export function referringStatusFor(referred: { accountStatus: string }[]) {
  return referrerStatus(
    referred.map((row) => ({
      status: row.accountStatus as ReturnType<typeof accountReferralStatus>,
    })),
  );
}
