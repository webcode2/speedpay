import { desc, eq } from "drizzle-orm";
import {
  investmentPackages,
  packageVersions,
  projects,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { adminHasPermission } from "@/permissions/check";

export type PackageInput = {
  projectId: string;
  name: string;
  description?: string | null;
  bannerImage: string;
  lotPrice: string;
  totalLots: number;
  /** Remaining slots for investors. Server derives reservedLots. */
  availableLots?: number;
  minimumLots?: number;
  maximumLots?: number | null;
  returnType: string;
  returnRate: string;
  durationDays: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  terms?: string | null;
};

export function availableLots(pkg: {
  totalLots: number;
  reservedLots: number;
  soldLots: number;
}) {
  return Math.max(0, pkg.totalLots - pkg.reservedLots - pkg.soldLots);
}

export function deriveInventoryStatus(status: string, available: number) {
  if (["CLOSED", "ARCHIVED", "DRAFT", "PAUSED"].includes(status)) return status;
  if (available <= 0) return "FULL";
  if (status === "FULL" && available > 0) return "OPEN";
  return status;
}

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

async function requireAnyPackageRead(adminId: string) {
  const can =
    (await adminHasPermission(adminId, "packages.update")) ||
    (await adminHasPermission(adminId, "packages.create")) ||
    (await adminHasPermission(adminId, "packages.activate")) ||
    (await adminHasPermission(adminId, "packages.pause"));
  if (!can) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

export function validatePackageInput(input: PackageInput) {
  if (!input.name.trim()) {
    throw new AppError("VALIDATION_ERROR", "Name is required.", 400);
  }
  if (!["FIXED_RETURN", "FIXED_PROFIT"].includes(input.returnType)) {
    throw new AppError("VALIDATION_ERROR", "Invalid returnType.", 400);
  }
  if (input.totalLots < 1) {
    throw new AppError("VALIDATION_ERROR", "totalLots must be >= 1.", 400);
  }
  if (input.durationDays < 1) {
    throw new AppError("VALIDATION_ERROR", "durationDays must be >= 1.", 400);
  }
  if ((input.minimumLots ?? 1) < 1) {
    throw new AppError("VALIDATION_ERROR", "minimumLots must be >= 1.", 400);
  }
  if (!input.bannerImage?.trim()) {
    throw new AppError("VALIDATION_ERROR", "Banner image is required.", 400);
  }
}

function validateTerms(input: PackageInput) {
  validatePackageInput(input);
}

function toView(
  pkg: typeof investmentPackages.$inferSelect,
  extras?: { projectName?: string; versions?: (typeof packageVersions.$inferSelect)[] },
) {
  const available = availableLots(pkg);
  return {
    ...pkg,
    availableLots: available,
    projectName: extras?.projectName,
    versions: extras?.versions,
  };
}

export async function listPackages(adminId: string, status?: string) {
  await requireAnyPackageRead(adminId);
  const db = getDb();
  const base = db
    .select({
      pkg: investmentPackages,
      projectName: projects.name,
    })
    .from(investmentPackages)
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id));
  const rows = status
    ? await base
        .where(eq(investmentPackages.status, status))
        .orderBy(desc(investmentPackages.createdAt))
    : await base.orderBy(desc(investmentPackages.createdAt));
  return rows.map((r) => toView(r.pkg, { projectName: r.projectName }));
}

export async function getPackage(adminId: string, id: string) {
  await requireAnyPackageRead(adminId);
  const db = getDb();
  const [row] = await db
    .select({
      pkg: investmentPackages,
      projectName: projects.name,
    })
    .from(investmentPackages)
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .where(eq(investmentPackages.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Package not found.", 404);
  const versions = await db
    .select()
    .from(packageVersions)
    .where(eq(packageVersions.packageId, id))
    .orderBy(desc(packageVersions.version));
  return toView(row.pkg, { projectName: row.projectName, versions });
}

async function ensureProject(projectId: string) {
  const db = getDb();
  const [p] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!p) throw new AppError("NOT_FOUND", "Project not found.", 404);
  if (p.status === "ARCHIVED") {
    throw new AppError("INVALID_STATE", "Cannot attach package to archived project.", 400);
  }
  return p;
}

async function snapshotVersion(
  packageId: string,
  pkg: typeof investmentPackages.$inferSelect,
  terms: string | null,
) {
  const db = getDb();
  const existing = await db
    .select({ version: packageVersions.version })
    .from(packageVersions)
    .where(eq(packageVersions.packageId, packageId))
    .orderBy(desc(packageVersions.version))
    .limit(1);
  const nextVersion = (existing[0]?.version ?? 0) + 1;
  const [ver] = await db
    .insert(packageVersions)
    .values({
      packageId,
      version: nextVersion,
      lotPrice: pkg.lotPrice,
      returnType: pkg.returnType,
      returnRate: pkg.returnRate,
      durationDays: pkg.durationDays,
      terms,
    })
    .returning();
  await db
    .update(investmentPackages)
    .set({ currentVersionId: ver!.id, updatedAt: new Date() })
    .where(eq(investmentPackages.id, packageId));
  return ver!;
}

export async function createPackage(adminId: string, input: PackageInput, meta: AuditMeta = {}) {
  await requirePerm(adminId, "packages.create");
  validateTerms(input);
  await ensureProject(input.projectId);
  const db = getDb();
  const [created] = await db
    .insert(investmentPackages)
    .values({
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description ?? null,
      bannerImage: input.bannerImage.trim(),
      lotPrice: input.lotPrice.trim(),
      totalLots: input.totalLots,
      minimumLots: input.minimumLots ?? 1,
      maximumLots: input.maximumLots ?? null,
      returnType: input.returnType,
      returnRate: input.returnRate.trim(),
      durationDays: input.durationDays,
      availableFrom: input.availableFrom ? new Date(input.availableFrom) : null,
      availableUntil: input.availableUntil ? new Date(input.availableUntil) : null,
      status: "DRAFT",
    })
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PACKAGE_CREATED",
    entityType: "investment_package",
    entityId: created!.id,
    after: { status: "DRAFT", name: created!.name },
    meta,
  });

  return toView(created!);
}

export async function updatePackage(
  adminId: string,
  id: string,
  input: PackageInput,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "packages.update");
  validateTerms(input);
  const detail = await getPackage(adminId, id);
  if (detail.status === "ARCHIVED") {
    throw new AppError("INVALID_STATE", "Archived packages cannot be edited.", 400);
  }
  await ensureProject(input.projectId);

  const financialChanged =
    detail.lotPrice !== input.lotPrice.trim() ||
    detail.returnType !== input.returnType ||
    detail.returnRate !== input.returnRate.trim() ||
    detail.durationDays !== input.durationDays;

  const db = getDb();
  const now = new Date();

  const maxAvailable = input.totalLots - detail.soldLots;
  if (maxAvailable < 0) {
    throw new AppError(
      "INVALID_STATE",
      "totalLots cannot be below sold lots.",
      400,
    );
  }

  let nextReserved = detail.reservedLots;
  let nextAvailable: number;
  if (input.availableLots !== undefined) {
    if (
      !Number.isInteger(input.availableLots) ||
      input.availableLots < 0 ||
      input.availableLots > maxAvailable
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        `availableLots must be an integer between 0 and ${maxAvailable}.`,
        400,
      );
    }
    nextAvailable = input.availableLots;
    nextReserved = input.totalLots - detail.soldLots - nextAvailable;
  } else {
    if (input.totalLots < detail.reservedLots + detail.soldLots) {
      throw new AppError(
        "INVALID_STATE",
        "totalLots cannot be below reserved+sold.",
        400,
      );
    }
    nextAvailable = availableLots({
      totalLots: input.totalLots,
      reservedLots: detail.reservedLots,
      soldLots: detail.soldLots,
    });
  }

  let nextStatus = deriveInventoryStatus(detail.status, nextAvailable);
  if (detail.status === "DRAFT") nextStatus = "DRAFT";

  const [updated] = await db
    .update(investmentPackages)
    .set({
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description ?? null,
      bannerImage: input.bannerImage.trim(),
      lotPrice: input.lotPrice.trim(),
      totalLots: input.totalLots,
      reservedLots: nextReserved,
      minimumLots: input.minimumLots ?? 1,
      maximumLots: input.maximumLots ?? null,
      returnType: input.returnType,
      returnRate: input.returnRate.trim(),
      durationDays: input.durationDays,
      availableFrom: input.availableFrom ? new Date(input.availableFrom) : null,
      availableUntil: input.availableUntil ? new Date(input.availableUntil) : null,
      status: nextStatus,
      updatedAt: now,
    })
    .where(eq(investmentPackages.id, id))
    .returning();

  if (financialChanged && ["OPEN", "FULL", "PAUSED"].includes(detail.status)) {
    await snapshotVersion(id, updated!, input.terms ?? null);
  }

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PACKAGE_UPDATED",
    entityType: "investment_package",
    entityId: id,
    before: { name: detail.name, status: detail.status },
    after: { name: updated!.name, status: updated!.status },
    meta,
  });

  return getPackage(adminId, id);
}

export async function activatePackage(adminId: string, id: string, meta: AuditMeta = {}) {
  await requirePerm(adminId, "packages.activate");
  const detail = await getPackage(adminId, id);
  if (!["DRAFT", "PAUSED", "FULL"].includes(detail.status)) {
    throw new AppError(
      "INVALID_STATE",
      `Cannot activate from ${detail.status}.`,
      400,
    );
  }
  const avail = availableLots(detail);
  const next = avail <= 0 ? "FULL" : "OPEN";
  const db = getDb();
  const [updated] = await db
    .update(investmentPackages)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(investmentPackages.id, id))
    .returning();

  if (detail.status === "DRAFT" || !detail.currentVersionId) {
    await snapshotVersion(id, updated!, null);
  }

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PACKAGE_ACTIVATED",
    entityType: "investment_package",
    entityId: id,
    before: { status: detail.status },
    after: { status: next },
    meta,
  });

  return getPackage(adminId, id);
}

export async function pausePackage(adminId: string, id: string, meta: AuditMeta = {}) {
  await requirePerm(adminId, "packages.pause");
  const detail = await getPackage(adminId, id);
  if (!["OPEN", "FULL"].includes(detail.status)) {
    throw new AppError("INVALID_STATE", `Cannot pause from ${detail.status}.`, 400);
  }
  const db = getDb();
  const [updated] = await db
    .update(investmentPackages)
    .set({ status: "PAUSED", updatedAt: new Date() })
    .where(eq(investmentPackages.id, id))
    .returning();
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PACKAGE_PAUSED",
    entityType: "investment_package",
    entityId: id,
    before: { status: detail.status },
    after: { status: "PAUSED" },
    meta,
  });
  return toView(updated!);
}

export async function closePackage(adminId: string, id: string, meta: AuditMeta = {}) {
  await requirePerm(adminId, "packages.update");
  const detail = await getPackage(adminId, id);
  if (!["OPEN", "FULL", "PAUSED"].includes(detail.status)) {
    throw new AppError("INVALID_STATE", `Cannot close from ${detail.status}.`, 400);
  }
  const db = getDb();
  const [updated] = await db
    .update(investmentPackages)
    .set({ status: "CLOSED", updatedAt: new Date() })
    .where(eq(investmentPackages.id, id))
    .returning();
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PACKAGE_CLOSED",
    entityType: "investment_package",
    entityId: id,
    before: { status: detail.status },
    after: { status: "CLOSED" },
    meta,
  });
  return toView(updated!);
}

export async function archivePackage(adminId: string, id: string, meta: AuditMeta = {}) {
  await requirePerm(adminId, "packages.update");
  const detail = await getPackage(adminId, id);
  if (!["DRAFT", "CLOSED"].includes(detail.status)) {
    throw new AppError(
      "INVALID_STATE",
      `Cannot archive from ${detail.status} (close first if open).`,
      400,
    );
  }
  const db = getDb();
  const [updated] = await db
    .update(investmentPackages)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(investmentPackages.id, id))
    .returning();
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PACKAGE_ARCHIVED",
    entityType: "investment_package",
    entityId: id,
    before: { status: detail.status },
    after: { status: "ARCHIVED" },
    meta,
  });
  return toView(updated!);
}
