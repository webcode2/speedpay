import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { admins } from "./admins";
import { platformPaymentAccounts } from "./platform-payment-accounts";
import { users } from "./users";
import { walletTransactions } from "./wallet-transactions";

export const deposits = pgTable(
  "deposits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("NGN"),
    status: text("status").notNull().default("PENDING"),
    provider: text("provider").notNull().default("manual"),
    providerRef: text("provider_ref"),
    senderTransactionId: text("sender_transaction_id"),
    senderName: text("sender_name"),
    receiptUrl: text("receipt_url"),
    receiptKey: text("receipt_key"),
    paymentAccountId: uuid("payment_account_id").references(
      () => platformPaymentAccounts.id,
      { onDelete: "set null" },
    ),
    walletTransactionId: uuid("wallet_transaction_id").references(
      () => walletTransactions.id,
      { onDelete: "set null" },
    ),
    failureReason: text("failure_reason"),
    adminNotes: text("admin_notes"),
    approvedByAdminId: uuid("approved_by_admin_id").references(
      () => admins.id,
      { onDelete: "set null" },
    ),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("deposits_user_id_idx").on(t.userId),
    index("deposits_status_idx").on(t.status),
    index("deposits_provider_ref_idx").on(t.providerRef),
    index("deposits_sender_tx_idx").on(t.senderTransactionId),
  ],
);

