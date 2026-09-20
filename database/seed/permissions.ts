import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { permissions } from "../schema";
import * as schema from "../schema";
import { PERMISSION_CATALOG } from "./catalog";

type Db = PostgresJsDatabase<typeof schema>;

export async function seedPermissions(db: Db): Promise<void> {
  for (const permission of PERMISSION_CATALOG) {
    await db
      .insert(permissions)
      .values({
        code: permission.code,
        name: permission.name,
      })
      .onConflictDoUpdate({
        target: permissions.code,
        set: { name: permission.name },
      });
  }
}
