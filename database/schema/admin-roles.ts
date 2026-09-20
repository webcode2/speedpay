import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { admins } from "./admins";
import { roles } from "./roles";

export const adminRoles = pgTable(
  "admin_roles",
  {
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.adminId, t.roleId] })],
);
