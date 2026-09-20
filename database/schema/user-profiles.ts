import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
