import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { platformPaymentAccounts } from "../schema";
import * as schema from "../schema";

type Db = PostgresJsDatabase<typeof schema>;

export const PAYMENT_ACCOUNTS_SEED = [
  {
    type: "BANK_TRANSFER",
    label: "Wema Bank Primary Corporate",
    bankName: "Wema Bank",
    accountNumber: "0123456789",
    accountName: "SPEED PAY GLOBAL TECH LTD",
    provider: "Wema Bank",
    notes: "Instant bank transfer / USSD deposit account. Processed within 5-15 mins.",
    status: "ACTIVE",
  },
  {
    type: "BANK_TRANSFER",
    label: "Moniepoint MFB Alternative",
    bankName: "Moniepoint MFB",
    accountNumber: "6234567890",
    accountName: "SPEED PAY GLOBAL TECH LTD",
    provider: "Moniepoint",
    notes: "Direct deposit / online banking transfer. Available 24/7.",
    status: "ACTIVE",
  },
];

export async function seedPaymentAccounts(db: Db) {
  let created = 0;
  let updated = 0;

  for (const item of PAYMENT_ACCOUNTS_SEED) {
    const [existing] = await db
      .select({ id: platformPaymentAccounts.id })
      .from(platformPaymentAccounts)
      .where(eq(platformPaymentAccounts.accountNumber, item.accountNumber))
      .limit(1);

    if (existing) {
      await db
        .update(platformPaymentAccounts)
        .set({
          ...item,
          updatedAt: new Date(),
        })
        .where(eq(platformPaymentAccounts.id, existing.id));
      updated += 1;
    } else {
      await db.insert(platformPaymentAccounts).values(item);
      created += 1;
    }
  }

  return { created, updated };
}
