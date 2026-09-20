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
import { investments } from "./investments";
import { users } from "./users";
import { walletTransactions } from "./wallet-transactions";

export const investmentAccruals = pgTable(
  "investment_accruals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    investmentId: uuid("investment_id")
      .notNull()
      .references(() => investments.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    principal: bigint("principal", { mode: "number" }).notNull(),
    accruedReturn: bigint("accrued_return", { mode: "number" }).notNull(),
    currentValue: bigint("current_value", { mode: "number" }).notNull(),
    expectedReturn: bigint("expected_return", { mode: "number" }).notNull(),
    maturityValue: bigint("maturity_value", { mode: "number" }).notNull(),
    deltaAccrued: bigint("delta_accrued", { mode: "number" }).notNull(),
    walletTransactionId: uuid("wallet_transaction_id").references(
      () => walletTransactions.id,
      { onDelete: "set null" },
    ),
    idempotencyKey: text("idempotency_key"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => admins.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("investment_accruals_investment_id_idx").on(t.investmentId),
    index("investment_accruals_user_id_idx").on(t.userId),
    index("investment_accruals_created_at_idx").on(t.createdAt),
    uniqueIndex("investment_accruals_investment_idempotency_uid")
      .on(t.investmentId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ],
);
