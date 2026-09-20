import { and, eq, gte, lte, sql } from "drizzle-orm";
import {
  deposits,
  investmentAccruals,
  investmentPackages,
  investments,
  users,
  walletTransactions,
  withdrawals,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { requireAdminPermission } from "@/permissions/check";

export type ReportRange = {
  from?: Date;
  to?: Date;
};

export function parseReportRange(from?: string | null, to?: string | null): ReportRange {
  const range: ReportRange = {};
  if (from) {
    const d = new Date(from);
    if (Number.isNaN(d.getTime())) {
      throw new AppError("VALIDATION_ERROR", "Invalid from date.", 400);
    }
    range.from = d;
  }
  if (to) {
    const d = new Date(to);
    if (Number.isNaN(d.getTime())) {
      throw new AppError("VALIDATION_ERROR", "Invalid to date.", 400);
    }
    range.to = d;
  }
  return range;
}

function createdAtFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: any,
  range: ReportRange,
) {
  const parts = [];
  if (range.from) parts.push(gte(column, range.from));
  if (range.to) parts.push(lte(column, range.to));
  return parts.length ? and(...parts) : undefined;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export async function getReportsSummary(adminId: string, range: ReportRange) {
  await requireAdminPermission(adminId, "reports.read");
  const db = getDb();
  const usersWhere = createdAtFilter(users.createdAt, range);
  const invWhere = createdAtFilter(investments.createdAt, range);
  const depWhere = createdAtFilter(deposits.createdAt, range);
  const wdWhere = createdAtFilter(withdrawals.createdAt, range);
  const accWhere = createdAtFilter(investmentAccruals.createdAt, range);
  const wtWhere = createdAtFilter(walletTransactions.createdAt, range);

  const [
    [newUsers],
    [verifiedUsers],
    [activeInvestors],
    [invVolume],
    [activeInv],
    [maturedInv],
    packagePerf,
    depositByStatus,
    withdrawalByStatus,
    [returnsSum],
    walletByDirection,
  ] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(usersWhere),
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(and(eq(users.status, "KYC_APPROVED"), usersWhere)),
    db
      .select({
        n: sql<number>`count(distinct ${investments.userId})`.mapWith(Number),
      })
      .from(investments)
      .where(and(eq(investments.status, "ACTIVE"), invWhere)),
    db
      .select({
        total: sql<number>`coalesce(sum(${investments.principal}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investments)
      .where(invWhere),
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(investments)
      .where(and(eq(investments.status, "ACTIVE"), invWhere)),
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(investments)
      .where(and(eq(investments.status, "MATURED"), invWhere)),
    db
      .select({
        packageId: investmentPackages.id,
        name: investmentPackages.name,
        soldLots: investmentPackages.soldLots,
        principal: sql<number>`coalesce(sum(${investments.principal}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investmentPackages)
      .leftJoin(
        investments,
        and(
          eq(investments.packageId, investmentPackages.id),
          invWhere ?? sql`true`,
        ),
      )
      .groupBy(investmentPackages.id, investmentPackages.name, investmentPackages.soldLots)
      .orderBy(sql`coalesce(sum(${investments.principal}), 0) desc`)
      .limit(20),
    db
      .select({
        status: deposits.status,
        count: sql<number>`count(*)`.mapWith(Number),
        amount: sql<number>`coalesce(sum(${deposits.amount}), 0)`.mapWith(Number),
      })
      .from(deposits)
      .where(depWhere)
      .groupBy(deposits.status),
    db
      .select({
        status: withdrawals.status,
        count: sql<number>`count(*)`.mapWith(Number),
        amount: sql<number>`coalesce(sum(${withdrawals.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(withdrawals)
      .where(wdWhere)
      .groupBy(withdrawals.status),
    db
      .select({
        total: sql<number>`coalesce(sum(${investmentAccruals.deltaAccrued}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investmentAccruals)
      .where(accWhere),
    db
      .select({
        direction: walletTransactions.direction,
        amount: sql<number>`coalesce(sum(${walletTransactions.amount}), 0)`.mapWith(
          Number,
        ),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(walletTransactions)
      .where(wtWhere)
      .groupBy(walletTransactions.direction),
  ]);

  return {
    range: {
      from: range.from?.toISOString() ?? null,
      to: range.to?.toISOString() ?? null,
    },
    users: {
      newUsers: newUsers?.n ?? 0,
      verifiedUsers: verifiedUsers?.n ?? 0,
      activeInvestors: activeInvestors?.n ?? 0,
    },
    investments: {
      volume: invVolume?.total ?? 0,
      activeCount: activeInv?.n ?? 0,
      maturedCount: maturedInv?.n ?? 0,
      packagePerformance: packagePerf.map((p) => ({
        packageId: p.packageId,
        name: p.name,
        soldLots: p.soldLots,
        principal: p.principal,
      })),
    },
    financial: {
      deposits: depositByStatus,
      withdrawals: withdrawalByStatus,
      returnsMaterialized: returnsSum?.total ?? 0,
      wallet: walletByDirection,
    },
  };
}

export const REPORT_EXPORT_KINDS = [
  "users",
  "investments",
  "deposits",
  "withdrawals",
  "returns",
  "wallet",
] as const;

export type ReportExportKind = (typeof REPORT_EXPORT_KINDS)[number];

export async function exportReportCsv(
  adminId: string,
  kind: string,
  range: ReportRange,
): Promise<{ filename: string; csv: string }> {
  await requireAdminPermission(adminId, "reports.read");
  if (!REPORT_EXPORT_KINDS.includes(kind as ReportExportKind)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `kind must be one of: ${REPORT_EXPORT_KINDS.join(", ")}`,
      400,
    );
  }
  const db = getDb();
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "users") {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(createdAtFilter(users.createdAt, range))
      .orderBy(users.createdAt);
    return {
      filename: `users-${stamp}.csv`,
      csv: rowsToCsv(
        rows.map((r) => ({
          id: r.id,
          email: r.email,
          status: r.status,
          createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        })),
      ),
    };
  }

  if (kind === "investments") {
    const rows = await db
      .select({
        id: investments.id,
        userId: investments.userId,
        packageId: investments.packageId,
        principal: investments.principal,
        lotCount: investments.lotCount,
        status: investments.status,
        createdAt: investments.createdAt,
      })
      .from(investments)
      .where(createdAtFilter(investments.createdAt, range))
      .orderBy(investments.createdAt);
    return {
      filename: `investments-${stamp}.csv`,
      csv: rowsToCsv(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        })),
      ),
    };
  }

  if (kind === "deposits") {
    const rows = await db
      .select({
        id: deposits.id,
        userId: deposits.userId,
        amount: deposits.amount,
        currency: deposits.currency,
        status: deposits.status,
        provider: deposits.provider,
        createdAt: deposits.createdAt,
      })
      .from(deposits)
      .where(createdAtFilter(deposits.createdAt, range))
      .orderBy(deposits.createdAt);
    return {
      filename: `deposits-${stamp}.csv`,
      csv: rowsToCsv(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        })),
      ),
    };
  }

  if (kind === "withdrawals") {
    const rows = await db
      .select({
        id: withdrawals.id,
        userId: withdrawals.userId,
        amount: withdrawals.amount,
        currency: withdrawals.currency,
        status: withdrawals.status,
        createdAt: withdrawals.createdAt,
      })
      .from(withdrawals)
      .where(createdAtFilter(withdrawals.createdAt, range))
      .orderBy(withdrawals.createdAt);
    return {
      filename: `withdrawals-${stamp}.csv`,
      csv: rowsToCsv(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        })),
      ),
    };
  }

  if (kind === "returns") {
    const rows = await db
      .select({
        id: investmentAccruals.id,
        investmentId: investmentAccruals.investmentId,
        userId: investmentAccruals.userId,
        deltaAccrued: investmentAccruals.deltaAccrued,
        accruedReturn: investmentAccruals.accruedReturn,
        createdAt: investmentAccruals.createdAt,
      })
      .from(investmentAccruals)
      .where(createdAtFilter(investmentAccruals.createdAt, range))
      .orderBy(investmentAccruals.createdAt);
    return {
      filename: `returns-${stamp}.csv`,
      csv: rowsToCsv(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
        })),
      ),
    };
  }

  // wallet
  const rows = await db
    .select({
      id: walletTransactions.id,
      walletId: walletTransactions.walletId,
      type: walletTransactions.type,
      status: walletTransactions.status,
      direction: walletTransactions.direction,
      amount: walletTransactions.amount,
      currency: walletTransactions.currency,
      createdAt: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .where(createdAtFilter(walletTransactions.createdAt, range))
    .orderBy(walletTransactions.createdAt);
  return {
    filename: `wallet-${stamp}.csv`,
    csv: rowsToCsv(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
    ),
  };
}
