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

export const maturities = pgTable(
  "maturities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    investmentId: uuid("investment_id")
      .notNull()
      .unique()
      .references(() => investments.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    principal: bigint("principal", { mode: "number" }).notNull(),
    expectedReturn: bigint("expected_return", { mode: "number" }).notNull(),
    maturityValue: bigint("maturity_value", { mode: "number" }).notNull(),
    priorAccrued: bigint("prior_accrued", { mode: "number" }).notNull(),
    availableCredited: bigint("available_credited", { mode: "number" }).notNull(),
    pendingDebited: bigint("pending_debited", { mode: "number" }).notNull(),
    idempotencyKey: text("idempotency_key"),
    processedBy: uuid("processed_by")
      .notNull()
      .references(() => admins.id, { onDelete: "restrict" }),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("maturities_user_id_idx").on(t.userId),
    uniqueIndex("maturities_idempotency_uid")
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ],
);
