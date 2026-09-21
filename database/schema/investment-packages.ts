import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const investmentPackages = pgTable(
  "investment_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    bannerImage: text("banner_image"),
    status: text("status").notNull().default("DRAFT"),
    lotPrice: text("lot_price").notNull(),
    totalLots: integer("total_lots").notNull(),
    reservedLots: integer("reserved_lots").notNull().default(0),
    soldLots: integer("sold_lots").notNull().default(0),
    minimumLots: integer("minimum_lots").notNull().default(1),
    maximumLots: integer("maximum_lots"),
    returnType: text("return_type").notNull(),
    returnRate: text("return_rate").notNull(),
    durationDays: integer("duration_days").notNull(),
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
  (t) => [
    index("investment_packages_project_id_idx").on(t.projectId),
    index("investment_packages_status_idx").on(t.status),
  ],
);
