import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import {
  adminRoles,
  admins,
  roles,
} from "@solar/database/schema";
import { hashPassword } from "@/auth/password";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import {
  getAdminRoleCodes,
  requireAdminPermission,
  requireAnyAdminPermission,
} from "@/permissions/check";

async function requireStaffView(adminId: string) {
  await requireAnyAdminPermission(adminId, ["staff.create", "staff.update"]);
}

async function resolveRoleIds(roleCodes: string[]) {
  const db = getDb();
  const unique = [...new Set(roleCodes.map((c) => c.trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new AppError("VALIDATION_ERROR", "At least one role is required.", 400);
  }
  const rows = await db
    .select({ id: roles.id, code: roles.code })
    .from(roles)
    .where(inArray(roles.code, unique));
  if (rows.length !== unique.length) {
    throw new AppError("VALIDATION_ERROR", "One or more roles are invalid.", 400);
  }
  return rows;
}

export async function listStaff(input: {
  adminId: string;
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  await requireStaffView(input.adminId);
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;
  const filters = [];
  if (input.status) filters.push(eq(admins.status, input.status));
  if (input.q?.trim()) {
    filters.push(ilike(admins.email, `%${input.q.trim()}%`));
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: admins.id,
      email: admins.email,
      name: admins.name,
      status: admins.status,
      createdAt: admins.createdAt,
    })
    .from(admins)
    .where(where)
    .orderBy(desc(admins.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(admins)
    .where(where);

  const ids = rows.map((r) => r.id);
  const roleRows =
    ids.length === 0
      ? []
      : await db
          .select({
            adminId: adminRoles.adminId,
            code: roles.code,
          })
          .from(adminRoles)
          .innerJoin(roles, eq(adminRoles.roleId, roles.id))
          .where(inArray(adminRoles.adminId, ids));

  const rolesByAdmin = new Map<string, string[]>();
  for (const r of roleRows) {
    const list = rolesByAdmin.get(r.adminId) ?? [];
    list.push(r.code);
    rolesByAdmin.set(r.adminId, list);
  }

  return {
    items: rows.map((r) => ({
      ...r,
      roles: rolesByAdmin.get(r.id) ?? [],
    })),
    total: countRow?.n ?? 0,
    limit,
    offset,
  };
}

export async function getStaff(adminId: string, id: string) {
  await requireStaffView(adminId);
  const db = getDb();
  const [row] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Staff member not found.", 404);
  const roleCodes = await getAdminRoleCodes(id);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    roles: roleCodes,
  };
}

export async function createStaff(
  actorId: string,
  input: {
    email: string;
    name: string;
    password: string;
    roleCodes: string[];
    status?: string;
  },
  meta: AuditMeta = {},
) {
  await requireAdminPermission(actorId, "staff.create");
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) {
    throw new AppError("VALIDATION_ERROR", "Email and name are required.", 400);
  }
  if (!input.password || input.password.length < 8) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Password must be at least 8 characters.",
      400,
    );
  }
  const status = input.status ?? "ACTIVE";
  if (status !== "ACTIVE" && status !== "DISABLED") {
    throw new AppError("VALIDATION_ERROR", "Invalid status.", 400);
  }

  const roleRows = await resolveRoleIds(input.roleCodes);
  const db = getDb();
  const passwordHash = await hashPassword(input.password);

  const created = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);
    if (existing) {
      throw new AppError("EMAIL_TAKEN", "Staff email already exists.", 409);
    }
    const [row] = await tx
      .insert(admins)
      .values({ email, name, passwordHash, status })
      .returning();
    await tx.insert(adminRoles).values(
      roleRows.map((r) => ({ adminId: row!.id, roleId: r.id })),
    );
    await writeAdminAudit(tx, {
      actorId,
      action: "STAFF_CREATED",
      entityType: "admin",
      entityId: row!.id,
      after: {
        email,
        name,
        status,
        roles: roleRows.map((r) => r.code),
      },
    meta,
  });
    return row!;
  });

  return getStaff(actorId, created.id);
}

export async function updateStaff(
  actorId: string,
  id: string,
  input: {
    name?: string;
    password?: string;
    status?: string;
    roleCodes?: string[];
  },
  meta: AuditMeta = {},
) {
  await requireAdminPermission(actorId, "staff.update");
  const db = getDb();
  const [existing] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  if (!existing) throw new AppError("NOT_FOUND", "Staff member not found.", 404);

  if (input.status === "DISABLED" && id === actorId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "You cannot disable your own account.",
      400,
    );
  }
  if (input.status && input.status !== "ACTIVE" && input.status !== "DISABLED") {
    throw new AppError("VALIDATION_ERROR", "Invalid status.", 400);
  }
  if (input.password !== undefined && input.password.length < 8) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Password must be at least 8 characters.",
      400,
    );
  }

  const beforeRoles = await getAdminRoleCodes(id);
  let roleRows: { id: string; code: string }[] | null = null;
  if (input.roleCodes) {
    roleRows = await resolveRoleIds(input.roleCodes);
  }

  const patch: {
    name?: string;
    status?: string;
    passwordHash?: string;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new AppError("VALIDATION_ERROR", "Name is required.", 400);
    patch.name = name;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.password) patch.passwordHash = await hashPassword(input.password);

  await db.transaction(async (tx) => {
    await tx.update(admins).set(patch).where(eq(admins.id, id));
    if (roleRows) {
      await tx.delete(adminRoles).where(eq(adminRoles.adminId, id));
      await tx.insert(adminRoles).values(
        roleRows.map((r) => ({ adminId: id, roleId: r.id })),
      );
    }
    await writeAdminAudit(tx, {
      actorId,
      action: "STAFF_UPDATED",
      entityType: "admin",
      entityId: id,
      before: {
        name: existing.name,
        status: existing.status,
        roles: beforeRoles,
      },
      after: {
        name: patch.name ?? existing.name,
        status: patch.status ?? existing.status,
        roles: roleRows ? roleRows.map((r) => r.code) : beforeRoles,
        passwordChanged: Boolean(input.password),
      },
    meta,
  });
  });

  return getStaff(actorId, id);
}
