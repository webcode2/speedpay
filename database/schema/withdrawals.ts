import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { admins } from "./admins";
import { payoutAccounts } from "./payout-accounts";
import { users } from "./users";
import { walletTransactions } from "./wallet-transactions";

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    payoutAccountId: uuid("payout_account_id")
      .notNull()
      .references(() => payoutAccounts.id, { onDelete: "restrict" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("NGN"),
    status: text("status").notNull().default("PENDING"),
    rejectionReason: text("rejection_reason"),
    idempotencyKey: text("idempotency_key"),
    walletTransactionId: uuid("wallet_transaction_id").references(
      () => walletTransactions.id,
      { onDelete: "set null" },
    ),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => admins.id, {
      onDelete: "set null",
    }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processedBy: uuid("processed_by").references(() => admins.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("withdrawals_user_id_idx").on(t.userId),
    index("withdrawals_status_idx").on(t.status),
    uniqueIndex("withdrawals_user_idempotency_uid")
      .on(t.userId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ],
);
