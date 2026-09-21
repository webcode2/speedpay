import { eq, inArray, sql } from "drizzle-orm";
import {
  deposits,
  investmentAccruals,
  investmentPackages,
  investments,
  ledgerAccounts,
  ledgerEntries,
  maturities,
  payoutAccounts,
  users,
  verificationRequests,
  withdrawals,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { buildDashboardMoney } from "@/lib/dashboard-money";
import { requireAnyAdminPermission } from "@/permissions/check";

export async function getAdminDashboard(adminId: string) {
  await requireAnyAdminPermission(adminId, [
    "users.read",
    "investments.read",
    "kyc.read",
    "deposits.read",
    "withdrawals.read",
    "returns.read",
  ]);
  const db = getDb();

  const [
    [userCount],
    [kycPending],
    [openPackages],
    [activeInvestments],
    [pendingWithdrawals],
    [pendingPayouts],
    [pendingDeposits],
    [activePrincipalRow],
    activeInvestmentRows,
    [maturedPrincipalRow],
    [maturedExpectedReturnRow],
    [activeAccrualRow],
    [walletLiabilityRow],
    [pendingDepositAmountRow],
    [pendingWithdrawalAmountRow],
  ] = await Promise.all([
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
    db
      .select({
        total: sql<number>`coalesce(sum(${investments.principal}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investments)
      .where(eq(investments.status, "ACTIVE")),
    db
      .select({
        principal: investments.principal,
        returnRate: investments.returnRate,
        returnType: investments.returnType,
        startAt: investments.startAt,
        maturityAt: investments.maturityAt,
      })
      .from(investments)
      .where(eq(investments.status, "ACTIVE")),
    db
      .select({
        total: sql<number>`coalesce(sum(${maturities.principal}), 0)`.mapWith(
          Number,
        ),
      })
      .from(maturities),
    db
      .select({
        total: sql<number>`coalesce(sum(${maturities.expectedReturn}), 0)`.mapWith(
          Number,
        ),
      })
      .from(maturities),
    db
      .select({
        total: sql<number>`coalesce(sum(${investmentAccruals.deltaAccrued}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investmentAccruals)
      .innerJoin(
        investments,
        eq(investmentAccruals.investmentId, investments.id),
      )
      .where(eq(investments.status, "ACTIVE")),
    db
      .select({
        total: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(ledgerEntries)
      .innerJoin(
        ledgerAccounts,
        eq(ledgerEntries.ledgerAccountId, ledgerAccounts.id),
      )
      .where(inArray(ledgerAccounts.code, ["AVAILABLE", "PENDING"])),
    db
      .select({
        total: sql<number>`coalesce(sum(${deposits.amount}), 0)`.mapWith(Number),
      })
      .from(deposits)
      .where(eq(deposits.status, "PENDING")),
    db
      .select({
        total: sql<number>`coalesce(sum(${withdrawals.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(withdrawals)
      .where(eq(withdrawals.status, "PENDING")),
  ]);

  return {
    totalUsers: userCount?.n ?? 0,
    kycPending: kycPending?.n ?? 0,
    openPackages: openPackages?.n ?? 0,
    activeInvestments: activeInvestments?.n ?? 0,
    pendingWithdrawals: pendingWithdrawals?.n ?? 0,
    pendingPayoutAccounts: pendingPayouts?.n ?? 0,
    pendingDeposits: pendingDeposits?.n ?? 0,
    money: buildDashboardMoney({
      activePrincipal: activePrincipalRow?.total ?? 0,
      maturedPrincipal: maturedPrincipalRow?.total ?? 0,
      walletLiability: walletLiabilityRow?.total ?? 0,
      pendingDepositAmount: pendingDepositAmountRow?.total ?? 0,
      pendingWithdrawalAmount: pendingWithdrawalAmountRow?.total ?? 0,
      maturedExpectedReturn: maturedExpectedReturnRow?.total ?? 0,
      activeAccrualDelta: activeAccrualRow?.total ?? 0,
      activeInvestments: activeInvestmentRows.map((row) => ({
        principal: Number(row.principal) || 0,
        returnRate: String(row.returnRate),
        returnType: String(row.returnType),
        startAt: row.startAt,
        maturityAt: row.maturityAt,
      })),
      currency: "NGN",
    }),
  };
}
