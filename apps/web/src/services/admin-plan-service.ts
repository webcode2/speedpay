import { asc, desc, eq, sql } from "drizzle-orm";
import {
  investmentPlans,
  investments,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { planDailyProfit } from "@/lib/daily-roi";
import { adminHasPermission } from "@/permissions/check";

export type PlanKind = "ROI";

export type PlanInput = {
  name: string;
  description?: string | null;
  bannerImage?: string | null;
  kind?: string;
  price: number;
  termRoi?: number;
  dailyRoi?: number;
  durationDays: number;
  dailyTaskLimit: number;
  taskReward: number;
  sortOrder?: number;
};

const OPEN_SLOT_CAP = 1_000_000;

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

async function requireAnyPlanRead(adminId: string) {
  const can =
    (await adminHasPermission(adminId, "plans.update")) ||
    (await adminHasPermission(adminId, "plans.create")) ||
    (await adminHasPermission(adminId, "plans.activate")) ||
    (await adminHasPermission(adminId, "plans.pause"));
  if (!can) throw new AppError("FORBIDDEN", "Missing required permission.", 403);
}

function asInt(value: unknown, field: string, min: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    throw new AppError(
      "VALIDATION_ERROR",
      `${field} must be a whole number of ${min} or more.`,
      400,
    );
  }
  return value;
}

export function validatePlanInput(input: PlanInput) {
  if (!input.name.trim()) {
    throw new AppError("VALIDATION_ERROR", "Name is required.", 400);
  }
  asInt(input.price, "price", 1);
  const termRoi = input.termRoi ?? input.dailyRoi ?? 0;
  asInt(termRoi, "termRoi", 0);
  asInt(input.durationDays, "durationDays", 1);
  asInt(input.dailyTaskLimit, "dailyTaskLimit", 1);
  asInt(input.taskReward, "taskReward", 0);
  if (input.sortOrder !== undefined) asInt(input.sortOrder, "sortOrder", 0);
}

export function toPlanView(plan: typeof investmentPlans.$inferSelect) {
  const termRoi = plan.dailyRoi;
  return {
    ...plan,
    termRoi,
    durationDays: plan.durationDays,
    dailyProfit: planDailyProfit(plan),
    perOrder: plan.taskReward,
    maturityPayout: plan.price + termRoi,
  };
}

/** Kept for inventory-integrity tests; subscribe no longer uses slots. */
export function availableSlots(plan: {
  totalSlots: number;
  reservedSlots: number;
  soldSlots: number;
}) {
  return Math.max(0, plan.totalSlots - plan.reservedSlots - plan.soldSlots);
}

export async function listPlans(adminId: string, status?: string) {
  await requireAnyPlanRead(adminId);
  const db = getDb();
  const base = db.select().from(investmentPlans);
  const rows = status
    ? await base
        .where(eq(investmentPlans.status, status))
        .orderBy(asc(investmentPlans.sortOrder), desc(investmentPlans.createdAt))
    : await base.orderBy(
        asc(investmentPlans.sortOrder),
        desc(investmentPlans.createdAt),
      );
  const counts = await db
    .select({
      planId: investments.planId,
      subscribers: sql<number>`count(*)`.mapWith(Number),
      activeSubscribers: sql<number>`count(*) filter (where ${investments.status} = 'ACTIVE')`.mapWith(
        Number,
      ),
    })
    .from(investments)
    .groupBy(investments.planId);
  const byPlan = new Map(counts.map((row) => [row.planId, row]));
  return rows.map((plan) => {
    const stats = byPlan.get(plan.id);
    return {
      ...toPlanView(plan),
      subscribers: stats?.subscribers ?? 0,
      activeSubscribers: stats?.activeSubscribers ?? 0,
    };
  });
}

export async function getPlan(adminId: string, id: string) {
  await requireAnyPlanRead(adminId);
  const db = getDb();
  const [row] = await db
    .select()
    .from(investmentPlans)
    .where(eq(investmentPlans.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Plan not found.", 404);
  return toPlanView(row);
}

function persistenceFields(input: PlanInput) {
  const price = input.price;
  const termRoi = input.termRoi ?? input.dailyRoi ?? 0;
  return {
    name: input.name.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    bannerImage: input.bannerImage?.trim() ? input.bannerImage.trim() : null,
    kind: "ROI",
    price,
    dailyRoi: termRoi,
    dailyTaskLimit: input.dailyTaskLimit,
    taskReward: input.taskReward,
    sortOrder: input.sortOrder ?? 0,
    slotPrice: String(price),
    totalSlots: OPEN_SLOT_CAP,
    minimumSlots: 1,
    maximumSlots: 1,
    returnType: "TERM_ROI",
    returnRate: String(termRoi),
    durationDays: input.durationDays,
  };
}

export async function createPlan(
  adminId: string,
  input: PlanInput,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "plans.create");
  validatePlanInput(input);
  const db = getDb();
  const [created] = await db
    .insert(investmentPlans)
    .values({
      ...persistenceFields(input),
      status: "DRAFT",
    })
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PLAN_CREATED",
    entityType: "investment_plan",
    entityId: created!.id,
    after: {
      status: "DRAFT",
      name: created!.name,
      kind: created!.kind,
      price: created!.price,
    },
    meta,
  });

  return toPlanView(created!);
}

export async function updatePlan(
  adminId: string,
  id: string,
  input: PlanInput,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "plans.update");
  validatePlanInput(input);
  const detail = await getPlan(adminId, id);
  if (detail.status === "ARCHIVED") {
    throw new AppError("INVALID_STATE", "Archived plans cannot be edited.", 400);
  }

  const db = getDb();
  const [updated] = await db
    .update(investmentPlans)
    .set({
      ...persistenceFields(input),
      updatedAt: new Date(),
    })
    .where(eq(investmentPlans.id, id))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PLAN_UPDATED",
    entityType: "investment_plan",
    entityId: id,
    before: { name: detail.name, status: detail.status, price: detail.price },
    after: { name: updated!.name, status: updated!.status, price: updated!.price },
    meta,
  });

  return toPlanView(updated!);
}

export async function activatePlan(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "plans.activate");
  const detail = await getPlan(adminId, id);
  if (!["DRAFT", "PAUSED", "CLOSED"].includes(detail.status)) {
    throw new AppError(
      "INVALID_STATE",
      `Cannot open from ${detail.status}.`,
      400,
    );
  }
  const db = getDb();
  const [updated] = await db
    .update(investmentPlans)
    .set({ status: "OPEN", updatedAt: new Date() })
    .where(eq(investmentPlans.id, id))
    .returning();

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PLAN_ACTIVATED",
    entityType: "investment_plan",
    entityId: id,
    before: { status: detail.status },
    after: { status: "OPEN" },
    meta,
  });

  return toPlanView(updated!);
}

export async function pausePlan(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "plans.pause");
  const detail = await getPlan(adminId, id);
  if (detail.status !== "OPEN") {
    throw new AppError(
      "INVALID_STATE",
      `Cannot pause from ${detail.status}.`,
      400,
    );
  }
  const db = getDb();
  const [updated] = await db
    .update(investmentPlans)
    .set({ status: "PAUSED", updatedAt: new Date() })
    .where(eq(investmentPlans.id, id))
    .returning();
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PLAN_PAUSED",
    entityType: "investment_plan",
    entityId: id,
    before: { status: detail.status },
    after: { status: "PAUSED" },
    meta,
  });
  return toPlanView(updated!);
}

export async function closePlan(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "plans.update");
  const detail = await getPlan(adminId, id);
  if (!["OPEN", "PAUSED"].includes(detail.status)) {
    throw new AppError(
      "INVALID_STATE",
      `Cannot close from ${detail.status}.`,
      400,
    );
  }
  const db = getDb();
  const [updated] = await db
    .update(investmentPlans)
    .set({ status: "CLOSED", updatedAt: new Date() })
    .where(eq(investmentPlans.id, id))
    .returning();
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PLAN_CLOSED",
    entityType: "investment_plan",
    entityId: id,
    before: { status: detail.status },
    after: { status: "CLOSED" },
    meta,
  });
  return toPlanView(updated!);
}

export async function archivePlan(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "plans.update");
  const detail = await getPlan(adminId, id);
  if (!["DRAFT", "CLOSED", "PAUSED"].includes(detail.status)) {
    throw new AppError(
      "INVALID_STATE",
      `Cannot archive from ${detail.status}.`,
      400,
    );
  }
  const db = getDb();
  const [updated] = await db
    .update(investmentPlans)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(investmentPlans.id, id))
    .returning();
  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PLAN_ARCHIVED",
    entityType: "investment_plan",
    entityId: id,
    before: { status: detail.status },
    after: { status: "ARCHIVED" },
    meta,
  });
  return toPlanView(updated!);
}

export async function deletePlan(
  adminId: string,
  id: string,
  meta: AuditMeta = {},
) {
  await requirePerm(adminId, "plans.update");
  const detail = await getPlan(adminId, id);

  const db = getDb();
  const [existingInv] = await db
    .select({ id: investments.id })
    .from(investments)
    .where(eq(investments.planId, id))
    .limit(1);

  if (existingInv) {
    throw new AppError(
      "INVALID_STATE",
      "Cannot delete a plan with existing subscriptions. Pause or close it instead.",
      400,
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(investmentPlans).where(eq(investmentPlans.id, id));
  });

  await writeAdminAudit(db, {
    actorId: adminId,
    action: "PLAN_DELETED",
    entityType: "investment_plan",
    entityId: id,
    before: {
      name: detail.name,
      status: detail.status,
      kind: detail.kind,
      price: detail.price,
    },
    meta,
  });

  return { ok: true, id };
}
