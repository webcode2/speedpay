import { asc, eq, inArray } from "drizzle-orm";
import {
  auditLogs,
  permissions,
  rolePermissions,
  roles,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { requireAdminPermission } from "@/permissions/check";

export async function listPermissions(adminId: string) {
  await requireAdminPermission(adminId, "roles.read");
  const db = getDb();
  return db
    .select({
      id: permissions.id,
      code: permissions.code,
      name: permissions.name,
      description: permissions.description,
    })
    .from(permissions)
    .orderBy(asc(permissions.code));
}

export async function listRoles(adminId: string) {
  await requireAdminPermission(adminId, "roles.read");
  const db = getDb();
  const roleRows = await db.select().from(roles).orderBy(asc(roles.code));
  const links = await db
    .select({
      roleId: rolePermissions.roleId,
      code: permissions.code,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

  const byRole = new Map<string, string[]>();
  for (const l of links) {
    const list = byRole.get(l.roleId) ?? [];
    list.push(l.code);
    byRole.set(l.roleId, list);
  }

  return roleRows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    permissions: (byRole.get(r.id) ?? []).sort(),
  }));
}

export async function getRole(adminId: string, id: string) {
  await requireAdminPermission(adminId, "roles.read");
  const db = getDb();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role) throw new AppError("NOT_FOUND", "Role not found.", 404);
  const perms = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, id));
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    permissions: perms.map((p) => p.code).sort(),
  };
}

export async function updateRolePermissions(
  actorId: string,
  id: string,
  permissionCodes: string[],
) {
  await requireAdminPermission(actorId, "roles.update");
  const db = getDb();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role) throw new AppError("NOT_FOUND", "Role not found.", 404);

  if (role.code === "SUPER_ADMIN") {
    throw new AppError(
      "VALIDATION_ERROR",
      "SUPER_ADMIN permissions are managed by seed and cannot be edited.",
      400,
    );
  }

  const unique = [...new Set(permissionCodes.map((c) => c.trim()).filter(Boolean))];
  const permRows =
    unique.length === 0
      ? []
      : await db
          .select({ id: permissions.id, code: permissions.code })
          .from(permissions)
          .where(inArray(permissions.code, unique));
  if (permRows.length !== unique.length) {
    throw new AppError(
      "VALIDATION_ERROR",
      "One or more permission codes are invalid.",
      400,
    );
  }

  const before = await getRole(actorId, id);

  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (permRows.length > 0) {
      await tx.insert(rolePermissions).values(
        permRows.map((p) => ({ roleId: id, permissionId: p.id })),
      );
    }
    await tx
      .update(roles)
      .set({ updatedAt: new Date() })
      .where(eq(roles.id, id));
    await tx.insert(auditLogs).values({
      actorId,
      actorType: "ADMIN",
      action: "ROLE_PERMISSIONS_UPDATED",
      entityType: "role",
      entityId: id,
      before: { permissions: before.permissions },
      after: { permissions: permRows.map((p) => p.code).sort() },
    });
  });

  return getRole(actorId, id);
}
