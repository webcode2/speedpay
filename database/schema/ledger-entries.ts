import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { ledgerAccounts } from "./ledger-accounts";

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerAccountId: uuid("ledger_account_id")
      .notNull()
      .references(() => ledgerAccounts.id, { onDelete: "restrict" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    entryType: text("entry_type").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ledger_entries_account_id_idx").on(t.ledgerAccountId),
    index("ledger_entries_reference_idx").on(t.referenceType, t.referenceId),
  ],
);
