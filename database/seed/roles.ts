import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { permissions, rolePermissions, roles } from "../schema";
import * as schema from "../schema";
import { ROLE_CATALOG, ROLE_PERMISSION_CODES } from "./catalog";

type Db = PostgresJsDatabase<typeof schema>;

export async function seedRoles(db: Db): Promise<void> {
  for (const role of ROLE_CATALOG) {
    await db
      .insert(roles)
      .values({
        code: role.code,
        name: role.name,
        description: role.description ?? null,
      })
      .onConflictDoUpdate({
        target: roles.code,
        set: {
          name: role.name,
          description: role.description ?? null,
          updatedAt: new Date(),
        },
      });
  }

  const allRoles = await db.select().from(roles);
  const allPermissions = await db.select().from(permissions);
  const permissionByCode = new Map(allPermissions.map((p) => [p.code, p]));

  for (const role of allRoles) {
    const codes = ROLE_PERMISSION_CODES[role.code] ?? [];
    for (const code of codes) {
      const permission = permissionByCode.get(code);
      if (!permission) {
        throw new Error(`Missing permission for role mapping: ${code}`);
      }

      const existing = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, role.id),
            eq(rolePermissions.permissionId, permission.id),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(rolePermissions).values({
          roleId: role.id,
          permissionId: permission.id,
        });
      }
    }
  }
}
