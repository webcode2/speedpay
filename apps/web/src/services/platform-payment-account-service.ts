import { desc, eq } from "drizzle-orm";
import { platformPaymentAccounts } from "@solar/database/schema";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { adminHasPermission } from "@/permissions/check";

export type PaymentAccountRow =
  typeof platformPaymentAccounts.$inferSelect;

export type PaymentAccountInput = {
  type: "BANK" | "MOBILE_MONEY" | "OTHER";
  label: string;
  accountName: string;
  accountNumber: string;
  bankName?: string | null;
  provider?: string | null;
  notes?: string | null;
};

export function pickRandomPublishedAccount<T>(
  accounts: T[],
  random: () => number = Math.random,
): T | null {
  if (accounts.length === 0) return null;
  const idx = Math.min(
    accounts.length - 1,
    Math.floor(random() * accounts.length),
  );
  return accounts[idx]!;
}

export function formatPaymentInstructions(account: {
  type: string;
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  provider: string | null;
  notes: string | null;
}): string {
  const lines = [
    `Transfer to: ${account.accountName}`,
    `Account / wallet: ${account.accountNumber}`,
  ];
  if (account.type === "BANK" && account.bankName) {
    lines.push(`Bank: ${account.bankName}`);
  }
  if (account.type === "MOBILE_MONEY" && account.provider) {
    lines.push(`Network: ${account.provider}`);
  }
  if (account.type === "OTHER" && account.provider) {
    lines.push(`Provider: ${account.provider}`);
  }
  if (account.notes) lines.push(account.notes);
  return lines.join("\n");
}

async function requirePerm(adminId: string, code: string) {
  if (!(await adminHasPermission(adminId, code))) {
    throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  }
}

function validateInput(input: PaymentAccountInput) {
  if (!["BANK", "MOBILE_MONEY", "OTHER"].includes(input.type)) {
    throw new AppError("VALIDATION_ERROR", "Invalid type.", 400);
  }
  if (
    !input.label.trim() ||
    !input.accountName.trim() ||
    !input.accountNumber.trim()
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "label, accountName, and accountNumber are required.",
      400,
    );
  }
}

export async function listPaymentAccounts(adminId: string) {
  await requirePerm(adminId, "payment_accounts.read");
  return getDb()
    .select()
    .from(platformPaymentAccounts)
    .orderBy(desc(platformPaymentAccounts.createdAt));
}

export async function getPaymentAccount(adminId: string, id: string) {
  await requirePerm(adminId, "payment_accounts.read");
  const [row] = await getDb()
    .select()
    .from(platformPaymentAccounts)
    .where(eq(platformPaymentAccounts.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Account not found.", 404);
  return row;
}

export async function listPublishedPaymentAccounts() {
  return getDb()
    .select()
    .from(platformPaymentAccounts)
    .where(eq(platformPaymentAccounts.status, "PUBLISHED"));
}

export async function createPaymentAccount(
  adminId: string,
  input: PaymentAccountInput,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "payment_accounts.write");
  validateInput(input);
  const db = getDb();
  const [row] = await db
    .insert(platformPaymentAccounts)
    .values({
      type: input.type,
      label: input.label.trim(),
      accountName: input.accountName.trim(),
      accountNumber: input.accountNumber.trim(),
      bankName: input.bankName ?? null,
      provider: input.provider ?? null,
      notes: input.notes ?? null,
      status: "DISABLED",
    })
    .returning();
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PAYMENT_ACCOUNT_CREATED",
    entityType: "platform_payment_account",
    entityId: row!.id,
    after: row,
    meta,
  });
  return row!;
}

export async function updatePaymentAccount(
  adminId: string,
  id: string,
  input: PaymentAccountInput,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "payment_accounts.write");
  validateInput(input);
  const db = getDb();
  const [row] = await db
    .update(platformPaymentAccounts)
    .set({
      type: input.type,
      label: input.label.trim(),
      accountName: input.accountName.trim(),
      accountNumber: input.accountNumber.trim(),
      bankName: input.bankName ?? null,
      provider: input.provider ?? null,
      notes: input.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(platformPaymentAccounts.id, id))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Account not found.", 404);
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PAYMENT_ACCOUNT_UPDATED",
    entityType: "platform_payment_account",
    entityId: id,
    after: row,
    meta,
  });
  return row;
}

export async function publishPaymentAccount(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "payment_accounts.write");
  const db = getDb();
  const [row] = await db
    .update(platformPaymentAccounts)
    .set({ status: "PUBLISHED", updatedAt: new Date() })
    .where(eq(platformPaymentAccounts.id, id))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Account not found.", 404);
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PAYMENT_ACCOUNT_PUBLISHED",
    entityType: "platform_payment_account",
    entityId: id,
    after: row,
    meta,
  });
  return row;
}

export async function disablePaymentAccount(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "payment_accounts.write");
  const db = getDb();
  const [row] = await db
    .update(platformPaymentAccounts)
    .set({ status: "DISABLED", updatedAt: new Date() })
    .where(eq(platformPaymentAccounts.id, id))
    .returning();
  if (!row) throw new AppError("NOT_FOUND", "Account not found.", 404);
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PAYMENT_ACCOUNT_DISABLED",
    entityType: "platform_payment_account",
    entityId: id,
    after: row,
    meta,
  });
  return row;
}

export async function deletePaymentAccount(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "payment_accounts.write");
  const db = getDb();
  const [existing] = await db
    .select()
    .from(platformPaymentAccounts)
    .where(eq(platformPaymentAccounts.id, id))
    .limit(1);
  if (!existing) throw new AppError("NOT_FOUND", "Account not found.", 404);
  if (existing.status !== "DISABLED") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Disable the account before deleting.",
      400,
    );
  }
  await db
    .delete(platformPaymentAccounts)
    .where(eq(platformPaymentAccounts.id, id));
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PAYMENT_ACCOUNT_DELETED",
    entityType: "platform_payment_account",
    entityId: id,
    before: existing,
    meta,
  });
}
