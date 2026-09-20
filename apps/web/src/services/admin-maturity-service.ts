import { and, desc, eq, lte, sql } from "drizzle-orm";
import {
  auditLogs,
  investmentAccruals,
  investmentPackages,
  investments,
  ledgerAccounts,
  ledgerEntries,
  maturities,
  projects,
  users,
  walletTransactions,
  wallets,
} from "@solar/database/schema";
import { calculateInvestmentReturn } from "@/calculations/investment-return";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
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

export function canProcessMaturity(input: {
  status: string;
  maturityAt: Date;
  now?: Date;
  alreadyProcessed: boolean;
}): string | null {
  if (input.alreadyProcessed) return "ALREADY_PROCESSED";
  if (input.status !== "ACTIVE") return "NOT_ACTIVE";
  const now = input.now ?? new Date();
  if (now.getTime() < input.maturityAt.getTime()) return "NOT_DUE";
  return null;
}

async function sumPriorAccruals(investmentId: string): Promise<number> {
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

export async function listDueMaturities(adminId: string) {
  await requirePerm(adminId, "maturities.read");
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
    .where(
      and(eq(investments.status, "ACTIVE"), lte(investments.maturityAt, now)),
    )
    .orderBy(investments.maturityAt)
    .limit(100);

  const items = [];
  for (const row of rows) {
    const [existing] = await db
      .select({ id: maturities.id })
      .from(maturities)
      .where(eq(maturities.investmentId, row.inv.id))
      .limit(1);
    if (existing) continue;

    const calc = calculateInvestmentReturn({
      principal: row.inv.principal,
      returnRate: row.inv.returnRate,
      returnType: row.inv.returnType,
      startAt: row.inv.startAt,
      maturityAt: row.inv.maturityAt,
      currentTime: now,
    });
    const priorAccrued = await sumPriorAccruals(row.inv.id);
    items.push({
      id: row.inv.id,
      userEmail: row.userEmail,
      packageName: row.packageName,
      projectName: row.projectName,
      principal: row.inv.principal,
      expectedReturn: toMinor(calc.expectedReturn),
      maturityValue: toMinor(calc.maturityValue),
      priorAccrued: toMinor(priorAccrued),
      maturityAt: row.inv.maturityAt,
      status: row.inv.status,
    });
  }
  return items;
}

export async function getMaturityPreview(adminId: string, investmentId: string) {
  await requirePerm(adminId, "maturities.read");
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

  const [existing] = await db
    .select()
    .from(maturities)
    .where(eq(maturities.investmentId, investmentId))
    .limit(1);

  const now = new Date();
  const calc = calculateInvestmentReturn({
    principal: row.inv.principal,
    returnRate: row.inv.returnRate,
    returnType: row.inv.returnType,
    startAt: row.inv.startAt,
    maturityAt: row.inv.maturityAt,
    currentTime: now,
  });
  const priorAccrued = toMinor(await sumPriorAccruals(investmentId));
  const maturityValue = toMinor(calc.maturityValue);
  const expectedReturn = toMinor(calc.expectedReturn);
  const gate = canProcessMaturity({
    status: row.inv.status,
    maturityAt: row.inv.maturityAt,
    now,
    alreadyProcessed: Boolean(existing),
  });

  return {
    id: row.inv.id,
    userId: row.inv.userId,
    userEmail: row.userEmail,
    packageName: row.packageName,
    projectName: row.projectName,
    status: row.inv.status,
    principal: row.inv.principal,
    expectedReturn,
    maturityValue,
    priorAccrued,
    availableCredited: maturityValue,
    pendingDebited: priorAccrued,
    maturityAt: row.inv.maturityAt,
    startAt: row.inv.startAt,
    eligible: gate === null,
    blockReason: gate,
    processed: existing ?? null,
  };
}

export async function processMaturity(input: {
  adminId: string;
  investmentId: string;
  idempotencyKey?: string;
}) {
  await requirePerm(input.adminId, "maturities.process");
  const db = getDb();

  if (input.idempotencyKey) {
    const [byKey] = await db
      .select()
      .from(maturities)
      .where(eq(maturities.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (byKey) return { maturity: byKey, replayed: true as const };
  }

  const preview = await getMaturityPreview(input.adminId, input.investmentId);
  if (!preview.eligible) {
    throw new AppError(
      "INVALID_STATE",
      preview.blockReason === "ALREADY_PROCESSED"
        ? "Maturity already processed."
        : preview.blockReason === "NOT_DUE"
          ? "Investment is not yet due."
          : "Investment cannot be matured.",
      400,
    );
  }

  await ensureWallet(preview.userId);
  const now = new Date();

  const maturity = await db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(investments)
      .where(eq(investments.id, input.investmentId))
      .for("update");
    if (!inv) throw new AppError("NOT_FOUND", "Investment not found.", 404);

    const [existing] = await tx
      .select()
      .from(maturities)
      .where(eq(maturities.investmentId, input.investmentId))
      .limit(1);
    if (existing) {
      return existing;
    }

    const gate = canProcessMaturity({
      status: inv.status,
      maturityAt: inv.maturityAt,
      now,
      alreadyProcessed: false,
    });
    if (gate) {
      throw new AppError("INVALID_STATE", `Cannot process: ${gate}`, 400);
    }

    const calc = calculateInvestmentReturn({
      principal: inv.principal,
      returnRate: inv.returnRate,
      returnType: inv.returnType,
      startAt: inv.startAt,
      maturityAt: inv.maturityAt,
      currentTime: now,
    });
    const [priorRow] = await tx
      .select({
        total: sql<number>`coalesce(sum(${investmentAccruals.deltaAccrued}), 0)`.mapWith(
          Number,
        ),
      })
      .from(investmentAccruals)
      .where(eq(investmentAccruals.investmentId, inv.id));
    const priorAccrued = toMinor(priorRow?.total ?? 0);
    const maturityValue = toMinor(calc.maturityValue);
    const expectedReturn = toMinor(calc.expectedReturn);

    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, inv.userId))
      .limit(1);
    if (!wallet) throw new AppError("INTERNAL_ERROR", "Wallet missing.", 500);

    const accounts = await tx
      .select()
      .from(ledgerAccounts)
      .where(eq(ledgerAccounts.walletId, wallet.id))
      .for("update");
    const available = accounts.find((a) => a.code === "AVAILABLE");
    const pending = accounts.find((a) => a.code === "PENDING");
    if (!available || !pending) {
      throw new AppError("INTERNAL_ERROR", "Ledger accounts missing.", 500);
    }

    if (priorAccrued > 0) {
      await tx.insert(ledgerEntries).values({
        ledgerAccountId: pending.id,
        amount: -priorAccrued,
        entryType: "MATURITY_PENDING_SETTLE",
        referenceType: "maturity",
        referenceId: inv.id,
        description: `Settle PENDING accruals for ${inv.id}`,
      });
    }

    const [txRow] = await tx
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: "RETURN",
        status: "COMPLETED",
        direction: "CREDIT",
        amount: maturityValue,
        currency: wallet.currency,
        referenceType: "maturity",
        referenceId: inv.id,
        description: `Maturity payout ${inv.id}`,
      })
      .returning();

    await tx.insert(ledgerEntries).values({
      ledgerAccountId: available.id,
      amount: maturityValue,
      entryType: "MATURITY_AVAILABLE_CREDIT",
      referenceType: "maturity",
      referenceId: inv.id,
      description: `Maturity credit ${inv.id}`,
    });

    await tx
      .update(investments)
      .set({ status: "MATURED", updatedAt: now })
      .where(eq(investments.id, inv.id));

    const [created] = await tx
      .insert(maturities)
      .values({
        investmentId: inv.id,
        userId: inv.userId,
        principal: inv.principal,
        expectedReturn,
        maturityValue,
        priorAccrued,
        availableCredited: maturityValue,
        pendingDebited: priorAccrued,
        idempotencyKey: input.idempotencyKey ?? null,
        processedBy: input.adminId,
        processedAt: now,
      })
      .returning();

    await tx.insert(auditLogs).values({
      actorId: input.adminId,
      actorType: "ADMIN",
      action: "MATURITY_PROCESSED",
      entityType: "maturity",
      entityId: created!.id,
      before: { status: "ACTIVE" },
      after: {
        status: "MATURED",
        maturityValue,
        priorAccrued,
        walletTransactionId: txRow!.id,
      },
    });

    return created!;
  });

  return { maturity, replayed: false as const };
}

export async function listInvestorMaturities(userId: string) {
  const db = getDb();
  const now = new Date();

  const due = await db
    .select({
      inv: investments,
      packageName: investmentPackages.name,
      projectName: projects.name,
    })
    .from(investments)
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .where(
      and(
        eq(investments.userId, userId),
        eq(investments.status, "ACTIVE"),
        lte(investments.maturityAt, now),
      ),
    )
    .orderBy(investments.maturityAt);

  const processed = await db
    .select({
      m: maturities,
      packageName: investmentPackages.name,
      projectName: projects.name,
      inv: investments,
    })
    .from(maturities)
    .innerJoin(investments, eq(maturities.investmentId, investments.id))
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .where(eq(maturities.userId, userId))
    .orderBy(desc(maturities.processedAt))
    .limit(50);

  return {
    eligible: due.map((r) => {
      const calc = calculateInvestmentReturn({
        principal: r.inv.principal,
        returnRate: r.inv.returnRate,
        returnType: r.inv.returnType,
        startAt: r.inv.startAt,
        maturityAt: r.inv.maturityAt,
        currentTime: now,
      });
      return {
        id: r.inv.id,
        status: r.inv.status,
        packageName: r.packageName,
        projectName: r.projectName,
        principal: r.inv.principal,
        maturityValue: toMinor(calc.maturityValue),
        maturityAt: r.inv.maturityAt,
        processed: false,
      };
    }),
    processed: processed.map((r) => ({
      id: r.inv.id,
      maturityId: r.m.id,
      status: r.inv.status,
      packageName: r.packageName,
      projectName: r.projectName,
      principal: r.m.principal,
      maturityValue: r.m.maturityValue,
      maturityAt: r.inv.maturityAt,
      processedAt: r.m.processedAt,
      processed: true,
    })),
  };
}
