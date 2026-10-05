import { pgTable, text, timestamp, uuid, uniqueIndex, index, type AnyPgColumn } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    status: text("status").notNull().default("EMAIL_UNVERIFIED"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    referralCode: text("referral_code").notNull(),
    referredByUserId: uuid("referred_by_user_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    uniqueIndex("users_phone_unique").on(t.phone),
    uniqueIndex("users_referral_code_uid").on(t.referralCode),
    index("users_referred_by_idx").on(t.referredByUserId),
  ],
);
