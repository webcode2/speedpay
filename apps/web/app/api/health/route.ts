import { sql } from "drizzle-orm";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { db } from "@/db";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await db.execute(sql`select 1`);
    logger.info("health.check", { database: "up" });
    return apiSuccess({
      status: "ok" as const,
      database: "up" as const,
      timestamp,
    });
  } catch (error) {
    logger.error("health.check_failed", {
      database: "down",
      reason: error instanceof Error ? error.message : "unknown",
    });
    return apiError(
      "DATABASE_UNAVAILABLE",
      "Database is unavailable.",
      503,
    );
  }
}
