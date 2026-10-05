import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const taskItems = pgTable(
  "task_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    imageKey: text("image_key").notNull(),
    status: text("status").notNull().default("DISABLED"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("task_items_status_sort_idx").on(t.status, t.sortOrder)],
);
