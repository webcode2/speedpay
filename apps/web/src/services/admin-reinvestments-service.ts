import { desc, eq, sql } from "drizzle-orm";
import {
  investmentPackages,
  investments,
  reinvestments,
  users,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { adminHasPermission } from "@/permissions/check";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

export async function listAdminReinvestments(input: {
  adminId: string;
  limit?: number;
  offset?: number;
}) {
  await requirePerm(input.adminId, "investments.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const rows = await db
    .select({
      r: reinvestments,
      userEmail: users.email,
      newPackageName: investmentPackages.name,
    })
    .from(reinvestments)
    .innerJoin(users, eq(reinvestments.userId, users.id))
    .innerJoin(investments, eq(reinvestments.newInvestmentId, investments.id))
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .orderBy(desc(reinvestments.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(reinvestments);

  return {
    items: rows.map((row) => ({
      id: row.r.id,
      amount: row.r.amount,
      userEmail: row.userEmail,
      parentInvestmentId: row.r.parentInvestmentId,
      newInvestmentId: row.r.newInvestmentId,
      newPackageName: row.newPackageName,
      createdAt: row.r.createdAt,
    })),
    total: countRow?.n ?? 0,
    limit,
    offset,
  };
}
