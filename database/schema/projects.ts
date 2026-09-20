import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    location: text("location"),
    capacity: text("capacity"),
    status: text("status").notNull().default("DRAFT"),
    startDate: text("start_date"),
    completionDate: text("completion_date"),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("projects_status_idx").on(t.status)],
);
