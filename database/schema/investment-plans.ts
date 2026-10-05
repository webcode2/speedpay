import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const investmentPlans = pgTable(
  "investment_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    bannerImage: text("banner_image"),
    kind: text("kind").notNull().default("ROI"),
    price: bigint("price", { mode: "number" }).notNull().default(0),
    dailyRoi: bigint("daily_roi", { mode: "number" }).notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("DRAFT"),
    slotPrice: text("slot_price").notNull(),
    totalSlots: integer("total_slots").notNull(),
    reservedSlots: integer("reserved_slots").notNull().default(0),
    soldSlots: integer("sold_slots").notNull().default(0),
    minimumSlots: integer("minimum_slots").notNull().default(1),
    maximumSlots: integer("maximum_slots"),
    returnType: text("return_type").notNull(),
    returnRate: text("return_rate").notNull(),
    durationDays: integer("duration_days").notNull(),
    dailyTaskLimit: integer("daily_task_limit").notNull().default(0),
    taskReward: bigint("task_reward", { mode: "number" }).notNull().default(0),
    availableFrom: timestamp("available_from", { withTimezone: true }),
    availableUntil: timestamp("available_until", { withTimezone: true }),
    currentVersionId: uuid("current_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("investment_plans_status_idx").on(t.status)],
);
