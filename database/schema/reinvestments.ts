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
import { investments } from "./investments";
import { users } from "./users";

export const reinvestments = pgTable(
  "reinvestments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentInvestmentId: uuid("parent_investment_id")
      .notNull()
      .references(() => investments.id, { onDelete: "restrict" }),
    newInvestmentId: uuid("new_investment_id")
      .notNull()
      .unique()
      .references(() => investments.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reinvestments_parent_id_idx").on(t.parentInvestmentId),
    index("reinvestments_user_id_idx").on(t.userId),
    uniqueIndex("reinvestments_user_idempotency_uid")
      .on(t.userId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ],
);
