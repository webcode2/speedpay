import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { investments, users } from "@solar/database/schema";
import { getDb } from "@/db";
import {
  accountReferralStatus,
  referrerStatus,
} from "@/lib/referral";

function startOfUtcMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getTeam(userId: string) {
  const db = getDb();
  const [me] = await db
    .select({
      id: users.id,
      email: users.email,
      referralCode: users.referralCode,
      referredByUserId: users.referredByUserId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const levelA = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.referredByUserId, userId))
    .orderBy(desc(users.createdAt));

  const aIds = levelA.map((r) => r.id);
  const levelB =
    aIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            email: users.email,
            status: users.status,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(inArray(users.referredByUserId, aIds))
          .orderBy(desc(users.createdAt));

  const bIds = levelB.map((r) => r.id);
  const levelC =
    bIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            email: users.email,
            status: users.status,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(inArray(users.referredByUserId, bIds))
          .orderBy(desc(users.createdAt));

  const all = [
    ...levelA.map((r) => ({ ...r, level: "A" as const })),
    ...levelB.map((r) => ({ ...r, level: "B" as const })),
    ...levelC.map((r) => ({ ...r, level: "C" as const })),
  ];
  const subscribed = new Set<string>();
  if (all.length > 0) {
    const rows = await db
      .select({ userId: investments.userId })
      .from(investments)
      .where(
        and(
          inArray(
            investments.userId,
            all.map((r) => r.id),
          ),
          eq(investments.status, "ACTIVE"),
        ),
      );
    for (const row of rows) subscribed.add(row.userId);
  }

  const members = all.map((row) => ({
    id: row.id,
    email: row.email,
    level: row.level,
    accountStatus: accountReferralStatus({
      userStatus: row.status,
      hasActiveInvestment: subscribed.has(row.id),
    }),
    createdAt: row.createdAt,
  }));

  const monthStart = startOfUtcMonth();
  const newMembers = members.filter((m) => m.createdAt >= monthStart).length;
  const activeMembers = members.filter((m) => m.accountStatus === "SUBSCRIBED").length;

  let referredBy: { id: string; email: string } | null = null;
  if (me?.referredByUserId) {
    const [ref] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, me.referredByUserId))
      .limit(1);
    referredBy = ref ?? null;
  }

  const [directSubscribed] = aIds.length
    ? await db
        .select({
          n: sql<number>`count(distinct ${investments.userId})`.mapWith(Number),
        })
        .from(investments)
        .where(
          and(
            inArray(investments.userId, aIds),
            eq(investments.status, "ACTIVE"),
          ),
        )
    : [{ n: 0 }];

  return {
    referralCode: me?.referralCode ?? "",
    referredBy,
    referringStatus: referrerStatus(
      members
        .filter((m) => m.level === "A")
        .map((m) => ({ status: m.accountStatus })),
    ),
    overview: {
      totalMembers: members.length,
      newMembers,
      activeMembers,
      directReferrals: levelA.length,
    },
    levels: {
      A: levelA.length,
      B: levelB.length,
      C: levelC.length,
    },
    members,
    subscribedDirect: directSubscribed?.n ?? 0,
  };
}
