import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { investmentPackages } from "./investment-packages";
import { investments } from "./investments";

export const investmentLots = pgTable(
  "investment_lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    investmentId: uuid("investment_id")
      .notNull()
      .references(() => investments.id, { onDelete: "cascade" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => investmentPackages.id, { onDelete: "restrict" }),
    lotCount: integer("lot_count").notNull(),
    pricePerLot: text("price_per_lot").notNull(),
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("investment_lots_investment_id_idx").on(t.investmentId),
    index("investment_lots_package_id_idx").on(t.packageId),
  ],
);
