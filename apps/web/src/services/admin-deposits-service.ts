import { desc, eq, sql } from "drizzle-orm";
import { deposits, users } from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { requireAdminPermission } from "@/permissions/check";

export async function listAdminDeposits(input: {
  adminId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdminPermission(input.adminId, "deposits.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;
  const where = input.status ? eq(deposits.status, input.status) : undefined;

  const rows = await db
    .select({
      deposit: deposits,
      userEmail: users.email,
    })
    .from(deposits)
    .innerJoin(users, eq(deposits.userId, users.id))
    .where(where)
    .orderBy(desc(deposits.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(deposits)
    .where(where);

  return {
    items: rows.map((r) => ({
      id: r.deposit.id,
      status: r.deposit.status,
      amount: r.deposit.amount,
      currency: r.deposit.currency,
      provider: r.deposit.provider,
      userEmail: r.userEmail,
      createdAt: r.deposit.createdAt,
    })),
    total: countRow?.n ?? 0,
    limit,
    offset,
  };
}

export async function getAdminDeposit(adminId: string, id: string) {
  await requireAdminPermission(adminId, "deposits.read");
  const db = getDb();
  const [row] = await db
    .select({
      deposit: deposits,
      userEmail: users.email,
    })
    .from(deposits)
    .innerJoin(users, eq(deposits.userId, users.id))
    .where(eq(deposits.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Deposit not found.", 404);
  return { ...row.deposit, userEmail: row.userEmail };
}
