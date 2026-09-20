import path from "node:path";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { seedAdmin } from "./admin";
import { seedNotificationTemplates } from "./notification-templates";
import { seedPermissions } from "./permissions";
import { seedRoles } from "./roles";
import { seedSettings } from "./settings";

loadEnv({ path: path.resolve(process.cwd(), "../.env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    await seedPermissions(db);
    await seedRoles(db);
    const admin = await seedAdmin(db);
    await seedSettings(db);
    await seedNotificationTemplates(db);
    console.info("[seed] complete", {
      adminEmail: admin.email,
      adminStatus: admin.status,
    });
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[seed] failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
