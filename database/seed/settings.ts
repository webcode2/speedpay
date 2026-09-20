import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { systemSettings } from "../schema";
import * as schema from "../schema";

type Db = PostgresJsDatabase<typeof schema>;

const SETTINGS: { key: string; value: string }[] = [
  { key: "app.name", value: "Solar Investment" },
  { key: "app.currency", value: "NGN" },
  { key: "security.password_min_length", value: "12" },
];

export async function seedSettings(db: Db): Promise<void> {
  for (const setting of SETTINGS) {
    await db
      .insert(systemSettings)
      .values({
        key: setting.key,
        value: setting.value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: setting.value,
          updatedAt: new Date(),
        },
      });
  }
}
