import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { investmentPackages } from "./investment-packages";

export const packageVersions = pgTable(
  "package_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => investmentPackages.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    lotPrice: text("lot_price").notNull(),
    returnType: text("return_type").notNull(),
    returnRate: text("return_rate").notNull(),
    durationDays: integer("duration_days").notNull(),
    terms: text("terms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("package_versions_package_id_idx").on(t.packageId)],
);
