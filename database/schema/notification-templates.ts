import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  channel: text("channel").notNull().default("IN_APP"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
