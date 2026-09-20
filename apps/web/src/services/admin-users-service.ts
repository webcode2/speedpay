import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  investments,
  payoutAccounts,
  userProfiles,
  users,
  verificationRequests,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { adminHasPermission } from "@/permissions/check";

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

  return { items: rows, total: countRow?.n ?? 0, limit, offset };
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

  const [invCount] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(investments)
    .where(eq(investments.userId, userId));
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

  return {
    ...row.user,
    profile: row.profile,
    investmentCount: invCount?.n ?? 0,
    payoutAccountCount: payoutCount?.n ?? 0,
    latestKyc: kyc
      ? { id: kyc.id, status: kyc.status, submittedAt: kyc.submittedAt }
      : null,
  };
}
