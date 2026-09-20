import { eq } from "drizzle-orm";
import {
  adminRoles,
  permissions,
  rolePermissions,
  roles,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";

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

export async function requireAdminPermission(
  adminId: string,
  code: string,
): Promise<void> {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

export async function requireAnyAdminPermission(
  adminId: string,
  codes: string[],
): Promise<void> {
  for (const code of codes) {
    if (await adminHasPermission(adminId, code)) return;
  }
  throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

export { hasAnyPermission } from "./visibility";
