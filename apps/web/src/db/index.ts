import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@solar/database/schema";
import { getEnv } from "@/env";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __solarPg?: ReturnType<typeof postgres>;
  __solarDb?: Db;
};

/** Lazily construct the Drizzle client. Throws if DATABASE_URL is missing/invalid. */
export function getDb(): Db {
  if (!globalForDb.__solarDb) {
    const { DATABASE_URL } = getEnv();
    // Keep pool small; Next.js HMR must reuse this via globalThis or it leaks clients.
    globalForDb.__solarPg = postgres(DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });
    globalForDb.__solarDb = drizzle(globalForDb.__solarPg, { schema });
  }
  return globalForDb.__solarDb;
}
