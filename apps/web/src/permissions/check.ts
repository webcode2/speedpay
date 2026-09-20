import { eq } from "drizzle-orm";
import {
  adminRoles,
  permissions,
  rolePermissions,
  roles,
} from "@solar/database/schema";
import { getDb } from "@/db";

export async function getAdminPermissionCodes(
  adminId: string,
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ code: permissions.code })
    .from(adminRoles)
    .innerJoin(roles, eq(adminRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(adminRoles.adminId, adminId));

  return [...new Set(rows.map((r) => r.code))];
}

export async function getAdminRoleCodes(adminId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ code: roles.code })
    .from(adminRoles)
    .innerJoin(roles, eq(adminRoles.roleId, roles.id))
    .where(eq(adminRoles.adminId, adminId));
  return rows.map((r) => r.code);
}

export async function adminHasPermission(
  adminId: string,
  code: string,
): Promise<boolean> {
  const codes = await getAdminPermissionCodes(adminId);
  return codes.includes(code);
}
