import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { investmentPlans } from "./investment-plans";
import { users } from "./users";

export const investments = pgTable(
  "investments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => investmentPlans.id, { onDelete: "restrict" }),
    planVersionId: uuid("plan_version_id"),
    principal: bigint("principal", { mode: "number" }).notNull(),
    dailyRoi: bigint("daily_roi", { mode: "number" }).notNull().default(0),
    lastRoiOn: date("last_roi_on", { mode: "string" }),
    slotCount: integer("slot_count").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    maturityAt: timestamp("maturity_at", { withTimezone: true }).notNull(),
    returnType: text("return_type").notNull(),
    returnRate: text("return_rate").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    parentInvestmentId: uuid("parent_investment_id"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("investments_user_id_idx").on(t.userId),
    index("investments_plan_id_idx").on(t.planId),
    index("investments_status_idx").on(t.status),
    index("investments_parent_id_idx").on(t.parentInvestmentId),
    uniqueIndex("investments_user_idempotency_uid")
      .on(t.userId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ],
);
