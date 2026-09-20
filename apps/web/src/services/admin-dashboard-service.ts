import { eq, sql } from "drizzle-orm";
import {
  deposits,
  investmentPackages,
  investments,
  payoutAccounts,
  users,
  verificationRequests,
  withdrawals,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { adminHasPermission } from "@/permissions/check";

async function requireAnyPerm(adminId: string, codes: string[]) {
  for (const code of codes) {
    if (await adminHasPermission(adminId, code)) return;
  }
  throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

export async function getAdminDashboard(adminId: string) {
  await requireAnyPerm(adminId, [
    "users.read",
    "investments.read",
    "kyc.read",
    "withdrawals.read",
    "returns.read",
  ]);
  const db = getDb();

  const [[userCount], [kycPending], [openPackages], [activeInvestments], [pendingWithdrawals], [pendingPayouts], [pendingDeposits]] =
    await Promise.all([
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(verificationRequests)
        .where(eq(verificationRequests.status, "PENDING")),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(investmentPackages)
        .where(eq(investmentPackages.status, "OPEN")),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(investments)
        .where(eq(investments.status, "ACTIVE")),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(withdrawals)
        .where(eq(withdrawals.status, "PENDING")),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(payoutAccounts)
        .where(eq(payoutAccounts.status, "PENDING")),
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(deposits)
        .where(eq(deposits.status, "PENDING")),
    ]);

  return {
    totalUsers: userCount?.n ?? 0,
    kycPending: kycPending?.n ?? 0,
    openPackages: openPackages?.n ?? 0,
    activeInvestments: activeInvestments?.n ?? 0,
    pendingWithdrawals: pendingWithdrawals?.n ?? 0,
    pendingPayoutAccounts: pendingPayouts?.n ?? 0,
    pendingDeposits: pendingDeposits?.n ?? 0,
  };
}
