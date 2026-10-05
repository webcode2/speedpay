import { eq, gte, inArray, sql } from "drizzle-orm";
import {
  deposits,
  investmentPlans,
  investments,
  ledgerAccounts,
  ledgerEntries,
  payoutAccounts,
  users,
  verificationRequests,
  withdrawals,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { seriesForPeriod } from "@/lib/dashboard-charts";
import { buildDashboardMoney } from "@/lib/dashboard-money";
import { requireAnyAdminPermission } from "@/permissions/check";
import { getAdminReferralSummary } from "@/services/admin-referrals-service";

export async function getAdminDashboard(adminId: string) {
  await requireAnyAdminPermission(adminId, [
    "users.read",
    "kyc.read",
    "payouts.read",
    "staff.create",
    "staff.update",
    "roles.read",
    "audit.read",
    "settings.read",
  ]);
  const db = getDb();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 364);
  since.setUTCHours(0, 0, 0, 0);
  const today = new Date().toISOString().slice(0, 10);

  const [
    [userCount],
    [kycPending],
    [openPlans],
    [activeInvestments],
    [pendingWithdrawals],
    [pendingPayouts],
    [pendingDeposits],
    dailyRows,
    adoptionRows,
    [activePrincipalRow],
    activeInvestmentRows,
    [maturedPrincipalRow],
    [maturedExpectedReturnRow],
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
      .from(investmentPlans)
      .where(eq(investmentPlans.status, "OPEN")),
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
        date: sql<string>`to_char(date_trunc('day', ${investments.createdAt} at time zone 'utc'), 'YYYY-MM-DD')`,
        amount: sql<number>`coalesce(sum(${investments.principal}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investments)
      .where(gte(investments.createdAt, since))
      .groupBy(sql`date_trunc('day', ${investments.createdAt} at time zone 'utc')`)
      .orderBy(sql`date_trunc('day', ${investments.createdAt} at time zone 'utc')`),
    db
      .select({
        planName: investmentPlans.name,
        subscribers: sql<number>`count(${investments.id})`.mapWith(Number),
        principal: sql<number>`coalesce(sum(${investments.principal}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investmentPlans)
      .leftJoin(investments, eq(investments.planId, investmentPlans.id))
      .groupBy(investmentPlans.id, investmentPlans.name)
      .orderBy(sql`count(${investments.id}) desc`)
      .limit(8),
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
        termRoi: investments.dailyRoi,
        startAt: investments.startAt,
        maturityAt: investments.maturityAt,
      })
      .from(investments)
      .where(eq(investments.status, "ACTIVE")),
    Promise.resolve([{ total: 0 }]),
    Promise.resolve([{ total: 0 }]),
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

  const referrals = await getAdminReferralSummary(adminId);

  return {
    totalUsers: userCount?.n ?? 0,
    kycPending: kycPending?.n ?? 0,
    openPlans: openPlans?.n ?? 0,
    activeInvestments: activeInvestments?.n ?? 0,
    pendingWithdrawals: pendingWithdrawals?.n ?? 0,
    pendingPayoutAccounts: pendingPayouts?.n ?? 0,
    pendingDeposits: pendingDeposits?.n ?? 0,
    dailyInvested: seriesForPeriod(
      dailyRows.map((row) => ({
        date: String(row.date).slice(0, 10),
        amount: Number(row.amount) || 0,
      })),
      "year",
      today,
    ),
    adoption: adoptionRows.map((row) => ({
      planName: row.planName,
      subscribers: Number(row.subscribers) || 0,
      principal: Number(row.principal) || 0,
    })),
    money: buildDashboardMoney({
      activePrincipal: activePrincipalRow?.total ?? 0,
      maturedPrincipal: maturedPrincipalRow?.total ?? 0,
      walletLiability: walletLiabilityRow?.total ?? 0,
      pendingDepositAmount: pendingDepositAmountRow?.total ?? 0,
      pendingWithdrawalAmount: pendingWithdrawalAmountRow?.total ?? 0,
      maturedExpectedReturn: maturedExpectedReturnRow?.total ?? 0,
      activeAccrualDelta: 0,
      activeInvestments: activeInvestmentRows.map((row) => ({
        principal: Number(row.principal) || 0,
        returnRate: String(row.returnRate),
        returnType: String(row.returnType),
        termRoi: Number(row.termRoi) || 0,
        startAt: row.startAt,
        maturityAt: row.maturityAt,
      })),
      currency: "NGN",
    }),
    referrals,
  };
}
