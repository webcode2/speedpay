import { and, desc, eq, sql } from "drizzle-orm";
import {
  investmentAccruals,
  investmentPackages,
  investments,
  ledgerAccounts,
  ledgerEntries,
  projects,
  users,
  walletTransactions,
  wallets,
} from "@solar/database/schema";
import { calculateInvestmentReturn } from "@/calculations/investment-return";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { adminHasPermission } from "@/permissions/check";
import { ensureWallet } from "@/services/wallet-service";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) {
    throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  }
}

function toMinor(n: number): number {
  return Math.round(n);
}

/** Pure: delta to materialize given current accrued and prior deltas. */
export function computeMaterializationDelta(
  currentAccrued: number,
  priorDeltaSum: number,
): number {
  return toMinor(currentAccrued) - toMinor(priorDeltaSum);
}

async function sumPriorDeltas(investmentId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${investmentAccruals.deltaAccrued}), 0)`.mapWith(
        Number,
      ),
    })
    .from(investmentAccruals)
    .where(eq(investmentAccruals.investmentId, investmentId));
  return row?.total ?? 0;
}

function previewForInvestment(
  inv: typeof investments.$inferSelect,
  priorDeltaSum: number,
  now: Date,
) {
  const calc = calculateInvestmentReturn({
    principal: inv.principal,
    returnRate: inv.returnRate,
    returnType: inv.returnType,
    startAt: inv.startAt,
    maturityAt: inv.maturityAt,
    currentTime: now,
  });
  const accruedReturn = toMinor(calc.accruedReturn);
  const deltaAccrued = computeMaterializationDelta(accruedReturn, priorDeltaSum);
  return {
    accruedReturn,
    currentValue: toMinor(calc.currentValue),
    expectedReturn: toMinor(calc.expectedReturn),
    maturityValue: toMinor(calc.maturityValue),
    percentageComplete: calc.percentageComplete,
    isMature: calc.isMature,
    priorMaterialized: toMinor(priorDeltaSum),
    deltaAccrued,
    eligible: deltaAccrued > 0 && inv.status === "ACTIVE",
  };
}

export async function listEligibleReturns(input: {
  adminId: string;
  eligibleOnly?: boolean;
}) {
  await requirePerm(input.adminId, "returns.read");
  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      inv: investments,
      packageName: investmentPackages.name,
      projectName: projects.name,
      userEmail: users.email,
    })
    .from(investments)
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .innerJoin(users, eq(investments.userId, users.id))
    .where(eq(investments.status, "ACTIVE"))
    .orderBy(desc(investments.createdAt))
    .limit(100);

  const items = [];
  for (const row of rows) {
    const prior = await sumPriorDeltas(row.inv.id);
    const preview = previewForInvestment(row.inv, prior, now);
    if (input.eligibleOnly !== false && !preview.eligible) continue;
    items.push({
      id: row.inv.id,
      userEmail: row.userEmail,
      packageName: row.packageName,
      projectName: row.projectName,
      status: row.inv.status,
      principal: row.inv.principal,
      startAt: row.inv.startAt,
      maturityAt: row.inv.maturityAt,
      ...preview,
    });
  }
  return items;
}

export async function getReturnPreview(adminId: string, investmentId: string) {
  await requirePerm(adminId, "returns.read");
  const db = getDb();
  const [row] = await db
    .select({
      inv: investments,
      packageName: investmentPackages.name,
      projectName: projects.name,
      userEmail: users.email,
    })
    .from(investments)
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .innerJoin(users, eq(investments.userId, users.id))
    .where(eq(investments.id, investmentId))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Investment not found.", 404);

  const prior = await sumPriorDeltas(investmentId);
  const preview = previewForInvestment(row.inv, prior, new Date());

  const history = await db
    .select()
    .from(investmentAccruals)
    .where(eq(investmentAccruals.investmentId, investmentId))
    .orderBy(desc(investmentAccruals.createdAt))
    .limit(20);

  return {
    id: row.inv.id,
    userId: row.inv.userId,
    userEmail: row.userEmail,
    packageName: row.packageName,
    projectName: row.projectName,
    status: row.inv.status,
    principal: row.inv.principal,
    returnType: row.inv.returnType,
    returnRate: row.inv.returnRate,
    startAt: row.inv.startAt,
    maturityAt: row.inv.maturityAt,
    ...preview,
    history,
  };
}

export async function materializeReturn(input: {
  adminId: string;
  investmentId: string;
  idempotencyKey?: string;
  meta?: AuditMeta;
}) {
  const meta = input.meta ?? {};
  await requirePerm(input.adminId, "returns.calculate");
  const db = getDb();
  const now = new Date();

  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(investmentAccruals)
      .where(
        and(
          eq(investmentAccruals.investmentId, input.investmentId),
          eq(investmentAccruals.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      return { accrual: existing, replayed: true as const };
    }
  }

  const detail = await getReturnPreview(input.adminId, input.investmentId);
  if (detail.status !== "ACTIVE") {
    throw new AppError(
      "INVALID_STATE",
      "Only ACTIVE investments can be materialized.",
      400,
    );
  }
  if (detail.deltaAccrued <= 0) {
    throw new AppError(
      "INVALID_STATE",
      "No new accrued return to materialize.",
      400,
    );
  }

  await ensureWallet(detail.userId);

  const accrual = await db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(investments)
      .where(eq(investments.id, input.investmentId))
      .for("update");

    if (!inv || inv.status !== "ACTIVE") {
      throw new AppError("INVALID_STATE", "Investment not materializable.", 400);
    }

    const [priorRow] = await tx
      .select({
        total: sql<number>`coalesce(sum(${investmentAccruals.deltaAccrued}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investmentAccruals)
      .where(eq(investmentAccruals.investmentId, input.investmentId));

    const prior = priorRow?.total ?? 0;
    const preview = previewForInvestment(inv, prior, now);
    if (preview.deltaAccrued <= 0) {
      throw new AppError(
        "INVALID_STATE",
        "No new accrued return to materialize.",
        400,
      );
    }

    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, inv.userId))
      .limit(1);
    if (!wallet) {
      throw new AppError("INTERNAL_ERROR", "Wallet missing.", 500);
    }

    const [pendingAccount] = await tx
      .select()
      .from(ledgerAccounts)
      .where(
        and(
          eq(ledgerAccounts.walletId, wallet.id),
          eq(ledgerAccounts.code, "PENDING"),
        ),
      )
      .for("update");

    if (!pendingAccount) {
      throw new AppError("INTERNAL_ERROR", "PENDING ledger account missing.", 500);
    }

    const [txRow] = await tx
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: "RETURN_ACCRUAL",
        status: "COMPLETED",
        direction: "CREDIT",
        amount: preview.deltaAccrued,
        currency: wallet.currency,
        referenceType: "investment",
        referenceId: inv.id,
        description: `Return accrual ${inv.id}`,
      })
      .returning();

    await tx.insert(ledgerEntries).values({
      ledgerAccountId: pendingAccount.id,
      amount: preview.deltaAccrued,
      entryType: "RETURN_ACCRUAL_CREDIT",
      referenceType: "investment_accrual",
      referenceId: inv.id,
      description: `Return accrual for investment ${inv.id}`,
    });

    const [created] = await tx
      .insert(investmentAccruals)
      .values({
        investmentId: inv.id,
        userId: inv.userId,
        asOf: now,
        principal: inv.principal,
        accruedReturn: preview.accruedReturn,
        currentValue: preview.currentValue,
        expectedReturn: preview.expectedReturn,
        maturityValue: preview.maturityValue,
        deltaAccrued: preview.deltaAccrued,
        walletTransactionId: txRow!.id,
        idempotencyKey: input.idempotencyKey ?? null,
        createdBy: input.adminId,
      })
      .returning();

    await writeAdminAudit(tx, {
      actorId: input.adminId,
      action: "RETURN_MATERIALIZED",
      entityType: "investment_accrual",
      entityId: created!.id,
      before: { priorMaterialized: prior },
      after: {
        investmentId: inv.id,
        deltaAccrued: preview.deltaAccrued,
        accruedReturn: preview.accruedReturn,
      },
    meta,
  });

    return created!;
  });

  return { accrual, replayed: false as const };
}
