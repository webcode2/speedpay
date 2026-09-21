import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const platformPaymentAccounts = pgTable(
  "platform_payment_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    label: text("label").notNull(),
    accountName: text("account_name").notNull(),
    accountNumber: text("account_number").notNull(),
    bankName: text("bank_name"),
    provider: text("provider"),
    notes: text("notes"),
    status: text("status").notNull().default("DISABLED"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("platform_payment_accounts_status_idx").on(t.status)],
);
