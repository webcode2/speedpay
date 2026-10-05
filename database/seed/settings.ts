import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { systemSettings } from "../schema";
import * as schema from "../schema";

type Db = PostgresJsDatabase<typeof schema>;

/** Canonical platform settings — seed inserts missing keys only. */
export const SETTINGS_SEED: { key: string; value: string; group: string }[] = [
  { key: "app.name", value: "Solar Investment", group: "app" },
  { key: "app.currency", value: "NGN", group: "app" },
  { key: "investment.default_currency", value: "NGN", group: "investment" },
  { key: "deposit.min_amount", value: "100", group: "deposit" },
  { key: "withdrawal.enabled", value: "true", group: "withdrawal" },
  { key: "withdrawal.min_amount", value: "100", group: "withdrawal" },
  { key: "withdrawal.pin_min_length", value: "4", group: "withdrawal" },
  { key: "withdrawal.pin_max_length", value: "6", group: "withdrawal" },
  { key: "returns.series_point_count", value: "24", group: "returns" },
  { key: "security.password_min_length", value: "12", group: "security" },
  { key: "security.session_ttl_days", value: "30", group: "security" },
  { key: "security.reset_token_ttl_minutes", value: "60", group: "security" },
  { key: "notifications.enabled", value: "true", group: "notification" },
  { key: "referral.level_a_commission_percent", value: "10", group: "referral" },
  { key: "referral.level_b_commission_percent", value: "2", group: "referral" },
  { key: "referral.level_c_commission_percent", value: "1", group: "referral" },
];

export const SETTINGS_KEYS = SETTINGS_SEED.map((s) => s.key);

export async function seedSettings(db: Db): Promise<void> {
  for (const setting of SETTINGS_SEED) {
    await db
      .insert(systemSettings)
      .values({
        key: setting.key,
        value: setting.value,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
  }
}
