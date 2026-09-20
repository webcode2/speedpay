import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { wallets } from "./wallets";

export const ledgerAccounts = pgTable(
  "ledger_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ledger_accounts_wallet_id_idx").on(t.walletId),
    unique("ledger_accounts_wallet_code_uid").on(t.walletId, t.code),
  ],
);
