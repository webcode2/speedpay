import { eq } from "drizzle-orm";
import { admins } from "@solar/database/schema";
import { verifyPassword } from "@/auth/password";
import {
  createAdminSession,
  resolveAdminSession,
  revokeAdminSessionByRawToken,
} from "@/auth/admin-session";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import {
  getAdminPermissionCodes,
  getAdminRoleCodes,
} from "@/permissions/check";

type Meta = { ipAddress?: string | null; userAgent?: string | null };

export async function loginAdmin(
  input: { email: string; password: string },
  meta: Meta = {},
) {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  if (!admin) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }

  const ok = await verifyPassword(admin.passwordHash, input.password);
  if (!ok) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }

  if (admin.status !== "ACTIVE") {
    throw new AppError("ACCOUNT_DISABLED", "This staff account is disabled.", 403);
  }

  const { rawToken } = await createAdminSession({
    adminId: admin.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const [roles, permissions] = await Promise.all([
    getAdminRoleCodes(admin.id),
    getAdminPermissionCodes(admin.id),
  ]);

  return {
    token: rawToken,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      status: admin.status,
      roles,
      permissions,
    },
  };
}

export async function logoutAdmin(rawToken: string) {
  await revokeAdminSessionByRawToken(rawToken);
}

export async function getCurrentAdmin(rawToken: string) {
  const resolved = await resolveAdminSession(rawToken);
  if (!resolved) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }
  const [roles, permissions] = await Promise.all([
    getAdminRoleCodes(resolved.admin.id),
    getAdminPermissionCodes(resolved.admin.id),
  ]);
  return {
    id: resolved.admin.id,
    email: resolved.admin.email,
    name: resolved.admin.name,
    status: resolved.admin.status,
    roles,
    permissions,
  };
}
