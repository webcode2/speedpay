import { desc, eq } from "drizzle-orm";
import {
  investmentPackages,
  packageVersions,
  projects,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { isPackageWithinWindow } from "@/lib/package-window";
import { availableLots } from "@/services/admin-package-service";

export function parseMoney(value: string): number {
  const n = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError("VALIDATION_ERROR", "Invalid lot price.", 400);
  }
  return n;
}

export function parseRatePercent(value: string): number {
  const n = Number(String(value).replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError("VALIDATION_ERROR", "Invalid return rate.", 400);
  }
  return n;
}

/** Package-term expected return for quote preview (C08). */
export function quoteInvestment(input: {
  lotCount: number;
  lotPrice: string;
  returnRate: string;
  durationDays: number;
  now?: Date;
}) {
  const lotPrice = parseMoney(input.lotPrice);
  const rate = parseRatePercent(input.returnRate);
  const principal = input.lotCount * lotPrice;
  const expectedReturn = (principal * rate) / 100;
  const maturityValue = principal + expectedReturn;
  const start = input.now ?? new Date();
  const maturityAt = new Date(
    start.getTime() + input.durationDays * 24 * 60 * 60 * 1000,
  );
  return {
    lotCount: input.lotCount,
    lotPrice: input.lotPrice,
    principal,
    expectedReturn,
    maturityValue,
    durationDays: input.durationDays,
    startAt: start.toISOString(),
    maturityAt: maturityAt.toISOString(),
  };
}

function isWithinWindow(pkg: {
  availableFrom: Date | null;
  availableUntil: Date | null;
}) {
  return isPackageWithinWindow(pkg);
}

function publicView(
  pkg: typeof investmentPackages.$inferSelect,
  projectName: string,
  version: typeof packageVersions.$inferSelect | null,
) {
  const available = availableLots(pkg);
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    status: pkg.status,
    projectId: pkg.projectId,
    projectName,
    lotPrice: version?.lotPrice ?? pkg.lotPrice,
    returnType: version?.returnType ?? pkg.returnType,
    returnRate: version?.returnRate ?? pkg.returnRate,
    durationDays: version?.durationDays ?? pkg.durationDays,
    terms: version?.terms ?? null,
    versionId: version?.id ?? pkg.currentVersionId,
    versionNumber: version?.version ?? null,
    minimumLots: pkg.minimumLots,
    maximumLots: pkg.maximumLots,
    availableLots: available,
    totalLots: pkg.totalLots,
    availableFrom: pkg.availableFrom,
    availableUntil: pkg.availableUntil,
  };
}

async function loadVersion(versionId: string | null, packageId: string) {
  const db = getDb();
  if (versionId) {
    const [v] = await db
      .select()
      .from(packageVersions)
      .where(eq(packageVersions.id, versionId))
      .limit(1);
    if (v) return v;
  }
  const [latest] = await db
    .select()
    .from(packageVersions)
    .where(eq(packageVersions.packageId, packageId))
    .orderBy(desc(packageVersions.version))
    .limit(1);
  return latest ?? null;
}

export async function listMarketplacePackages() {
  const db = getDb();
  const rows = await db
    .select({
      pkg: investmentPackages,
      projectName: projects.name,
    })
    .from(investmentPackages)
    .innerJoin(projects, eq(investmentPackages.projectId, projects.id))
    .where(eq(investmentPackages.status, "OPEN"))
    .orderBy(desc(investmentPackages.createdAt));

  const items = [];
  for (const row of rows) {
    if (!isWithinWindow(row.pkg)) continue;
    const version = await loadVersion(row.pkg.currentVersionId, row.pkg.id);
    items.push(publicView(row.pkg, row.projectName, version));
  }
  return items;
}

export async function getMarketplacePackage(id: string) {
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
  if (row.pkg.status !== "OPEN") {
    throw new AppError("INVALID_STATE", "Package is not open for investment.", 400);
  }
  if (!isWithinWindow(row.pkg)) {
    throw new AppError("INVALID_STATE", "Package is outside its availability window.", 400);
  }
  const version = await loadVersion(row.pkg.currentVersionId, row.pkg.id);
  return publicView(row.pkg, row.projectName, version);
}

export async function quoteMarketplacePackage(id: string, lotCount: number) {
  if (!Number.isInteger(lotCount) || lotCount < 1) {
    throw new AppError("VALIDATION_ERROR", "lotCount must be a positive integer.", 400);
  }
  const detail = await getMarketplacePackage(id);
  if (lotCount < detail.minimumLots) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Minimum lots is ${detail.minimumLots}.`,
      400,
    );
  }
  if (detail.maximumLots != null && lotCount > detail.maximumLots) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Maximum lots is ${detail.maximumLots}.`,
      400,
    );
  }
  if (lotCount > detail.availableLots) {
    throw new AppError(
      "INVALID_STATE",
      `Only ${detail.availableLots} lots available.`,
      400,
    );
  }
  const quote = quoteInvestment({
    lotCount,
    lotPrice: detail.lotPrice,
    returnRate: detail.returnRate,
    durationDays: detail.durationDays,
  });
  return {
    package: detail,
    quote: {
      ...quote,
      returnType: detail.returnType,
      returnRate: detail.returnRate,
      versionId: detail.versionId,
    },
  };
}
