import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { adminRoles, admins, auditLogs, roles } from "../schema";
import * as schema from "../schema";
import { hashPassword } from "./hash";

type Db = PostgresJsDatabase<typeof schema>;

export type SeededAdmin = {
  id: string;
  email: string;
  status: string;
};

export async function seedAdmin(db: Db): Promise<SeededAdmin> {
  const email =
    process.env.SEED_ADMIN_EMAIL?.trim() || "admin@solar.local";
  const password =
    process.env.SEED_ADMIN_PASSWORD?.trim() || "ChangeMeNow!123";
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Super Admin";

  const passwordHash = await hashPassword(password);

  const existing = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  let admin: typeof admins.$inferSelect;

  if (existing[0]) {
    const [updated] = await db
      .update(admins)
      .set({
        passwordHash,
        name,
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(admins.id, existing[0].id))
      .returning();
    admin = updated!;
  } else {
    const [created] = await db
      .insert(admins)
      .values({
        email,
        passwordHash,
        name,
        status: "ACTIVE",
      })
      .returning();
    admin = created!;
  }

  const [superAdminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.code, "SUPER_ADMIN"))
    .limit(1);

  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role missing; seed roles first");
  }

  const link = await db
    .select()
    .from(adminRoles)
    .where(
      and(
        eq(adminRoles.adminId, admin.id),
        eq(adminRoles.roleId, superAdminRole.id),
      ),
    )
    .limit(1);

  if (link.length === 0) {
    await db.insert(adminRoles).values({
      adminId: admin.id,
      roleId: superAdminRole.id,
    });
  }

  await db.insert(auditLogs).values({
    actorType: "SYSTEM",
    action: "SEED_COMPLETED",
    entityType: "admin",
    entityId: admin.id,
    after: {
      email: admin.email,
      name: admin.name,
      status: admin.status,
      role: "SUPER_ADMIN",
    },
    reason: "Chunk 02 database seed",
  });

  return {
    id: admin.id,
    email: admin.email,
    status: admin.status,
  };
}
