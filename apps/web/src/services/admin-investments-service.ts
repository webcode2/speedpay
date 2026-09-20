import { desc, eq, sql } from "drizzle-orm";
import {
  investmentPackages,
  investments,
  projects,
  users,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { adminHasPermission } from "@/permissions/check";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

export async function listAdminInvestments(input: {
  adminId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  await requirePerm(input.adminId, "investments.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;
  const where = input.status
    ? eq(investments.status, input.status)
    : undefined;

  const rows = await db
    .select({
      inv: investments,
      userEmail: users.email,
      packageName: investmentPackages.name,
      projectName: projects.name,
    })
    .from(investments)
    .innerJoin(users, eq(investments.userId, users.id))
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .where(where)
    .orderBy(desc(investments.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(investments)
    .where(where);

  return {
    items: rows.map((r) => ({
      id: r.inv.id,
      status: r.inv.status,
      principal: r.inv.principal,
      lotCount: r.inv.lotCount,
      userEmail: r.userEmail,
      packageName: r.packageName,
      projectName: r.projectName,
      startAt: r.inv.startAt,
      maturityAt: r.inv.maturityAt,
      createdAt: r.inv.createdAt,
    })),
    total: countRow?.n ?? 0,
    limit,
    offset,
  };
}

export async function getAdminInvestment(adminId: string, id: string) {
  await requirePerm(adminId, "investments.read");
  const db = getDb();
  const [row] = await db
    .select({
      inv: investments,
      userEmail: users.email,
      packageName: investmentPackages.name,
      projectName: projects.name,
    })
    .from(investments)
    .innerJoin(users, eq(investments.userId, users.id))
    .innerJoin(
      investmentPackages,
      eq(investments.packageId, investmentPackages.id),
    )
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .where(eq(investments.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Investment not found.", 404);
  return {
    ...row.inv,
    userEmail: row.userEmail,
    packageName: row.packageName,
    projectName: row.projectName,
  };
}
