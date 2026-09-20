import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@solar/database/schema";
import { getEnv } from "@/env";

type Db = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | undefined;
let dbInstance: Db | undefined;

/** Lazily construct the Drizzle client. Throws if DATABASE_URL is missing/invalid. */
export function getDb(): Db {
  if (!dbInstance) {
    const { DATABASE_URL } = getEnv();
    client = postgres(DATABASE_URL, {
      max: 10,
    });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}
