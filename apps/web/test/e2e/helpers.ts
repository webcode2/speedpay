import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getEnv } from "@/env";

let probed: boolean | null = null;

/** Returns true when DATABASE_URL is reachable. Caches the result per process. */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (probed != null) return probed;
  try {
    getEnv();
    await getDb().execute(sql`select 1`);
    probed = true;
  } catch {
    probed = false;
  }
  return probed;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`;
}

export const E2E_PASSWORD = "E2eTestPassword!123";

export function seedAdminCreds() {
  return {
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@solar.local",
    password: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!123",
  };
}

export const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
