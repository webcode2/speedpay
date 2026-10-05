import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { taskItems } from "./task-items";
import { users } from "./users";
import { walletTransactions } from "./wallet-transactions";

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskItemId: uuid("task_item_id")
      .notNull()
      .references(() => taskItems.id, { onDelete: "restrict" }),
    stars: integer("stars").notNull(),
    comment: text("comment").notNull(),
    rewardAmount: bigint("reward_amount", { mode: "number" }).notNull(),
    taskDate: date("task_date").notNull(),
    walletTransactionId: uuid("wallet_transaction_id").references(
      () => walletTransactions.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("task_completions_user_item_date_uid").on(
      t.userId,
      t.taskItemId,
      t.taskDate,
    ),
    index("task_completions_user_date_idx").on(t.userId, t.taskDate),
  ],
);
