import { desc, eq } from "drizzle-orm";
import { deposits } from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { getPaymentProvider } from "@/payments";
import { safeNotify } from "@/services/notification-service";
import { postLedgerEntry } from "@/services/wallet-service";
import { getSetting, getSettingNumber } from "@/settings/settings";

export async function createDeposit(userId: string, amount: number) {
  const minDeposit = await getSettingNumber("deposit.min_amount", 100);
  const currency = await getSetting("app.currency", "NGN");
  if (!Number.isInteger(amount) || amount < minDeposit) {
    throw new AppError(
      "VALIDATION_ERROR",
      `amount must be an integer >= ${minDeposit} (minor units).`,
      400,
    );
  }

  const db = getDb();
  const [deposit] = await db
    .insert(deposits)
    .values({
      userId,
      amount,
      currency,
      status: "PENDING",
      provider: "mock",
    })
    .returning();

  const provider = getPaymentProvider();
  const init = await provider.initialize({
    amount,
    currency,
    reference: deposit!.id,
    metadata: { userId },
  });

  const [updated] = await db
    .update(deposits)
    .set({
      provider: provider.name,
      providerRef: init.providerRef,
      status: "PROCESSING",
      updatedAt: new Date(),
    })
    .where(eq(deposits.id, deposit!.id))
    .returning();

  return {
    deposit: updated!,
    payment: {
      providerRef: init.providerRef,
      paymentUrl: init.paymentUrl,
      instructions: init.instructions,
    },
  };
}

export async function listDeposits(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(deposits)
    .where(eq(deposits.userId, userId))
    .orderBy(desc(deposits.createdAt))
    .limit(50);
}

export async function getDeposit(userId: string, id: string) {
  const db = getDb();
  const [row] = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
  if (!row || row.userId !== userId) {
    throw new AppError("NOT_FOUND", "Deposit not found.", 404);
  }
  return row;
}

export async function verifyDeposit(userId: string, id: string) {
  const deposit = await getDeposit(userId, id);

  if (deposit.status === "SUCCESS") {
    return { deposit, credited: false, alreadyComplete: true };
  }
  if (["CANCELLED", "REFUNDED"].includes(deposit.status)) {
    throw new AppError(
      "INVALID_STATE",
      `Cannot verify deposit in status ${deposit.status}.`,
      400,
    );
  }
  if (!deposit.providerRef) {
    throw new AppError("INVALID_STATE", "Deposit has no provider reference.", 400);
  }

  const provider = getPaymentProvider();
  const result = await provider.verify(deposit.providerRef);
  const db = getDb();

  if (result.status === "PENDING") {
    const [updated] = await db
      .update(deposits)
      .set({ status: "PROCESSING", updatedAt: new Date() })
      .where(eq(deposits.id, id))
      .returning();
    return { deposit: updated!, credited: false, alreadyComplete: false };
  }

  if (result.status === "FAILED") {
    const [updated] = await db
      .update(deposits)
      .set({
        status: "FAILED",
        failureReason: "Payment provider reported failure",
        updatedAt: new Date(),
      })
      .where(eq(deposits.id, id))
      .returning();
    return { deposit: updated!, credited: false, alreadyComplete: false };
  }

  // SUCCESS — credit wallet once
  const creditAmount =
    result.amount > 0 ? result.amount : deposit.amount;

  if (creditAmount !== deposit.amount) {
    throw new AppError(
      "INVALID_STATE",
      "Provider amount does not match deposit amount.",
      400,
    );
  }

  const { transaction } = await postLedgerEntry({
    userId,
    accountCode: "AVAILABLE",
    amount: creditAmount,
    entryType: "DEPOSIT_CREDIT",
    referenceType: "deposit",
    referenceId: deposit.id,
    description: `Deposit ${deposit.id}`,
    walletTx: {
      type: "DEPOSIT",
      status: "COMPLETED",
      direction: "CREDIT",
      amount: creditAmount,
    },
  });

  const [updated] = await db
    .update(deposits)
    .set({
      status: "SUCCESS",
      walletTransactionId: transaction?.id ?? null,
      failureReason: null,
      updatedAt: new Date(),
    })
    .where(eq(deposits.id, id))
    .returning();

  await safeNotify({
    userId,
    code: "DEPOSIT_COMPLETED",
    vars: {
      amount: creditAmount,
      currency: updated!.currency,
    },
    data: { depositId: id },
  });

  return { deposit: updated!, credited: true, alreadyComplete: false };
}
