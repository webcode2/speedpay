import net from "node:net";
import path from "node:path";
import { config as loadEnv } from "dotenv";

if (net.setDefaultAutoSelectFamily) {
  net.setDefaultAutoSelectFamily(false);
}
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { seedAdmin } from "./admin";
import { seedInvestments } from "./investments";
import { seedNotificationTemplates } from "./notification-templates";
import { seedPaymentAccounts } from "./payment-accounts";
import { seedPermissions } from "./permissions";
import { seedRoles } from "./roles";
import { seedSettings } from "./settings";
import { seedTaskItems } from "./task-items";

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
    console.info("[seed] start permissions...");
    await seedPermissions(db);
    console.info("[seed] start roles...");
    await seedRoles(db);
    console.info("[seed] start admin...");
    const admin = await seedAdmin(db);
    console.info("[seed] start settings...");
    await seedSettings(db);
    console.info("[seed] start notification templates...");
    await seedNotificationTemplates(db);
    console.info("[seed] start investments...");
    await seedInvestments(db);
    console.info("[seed] start payment accounts...");
    await seedPaymentAccounts(db);
    console.info("[seed] start task items...");
    await seedTaskItems(db);
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
