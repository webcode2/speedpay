import { desc, eq } from "drizzle-orm";
import {
  auditLogs,
  users,
  verificationDocuments,
  verificationRequests,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { adminHasPermission } from "@/permissions/check";
import { getStorage } from "@/storage";

async function requirePerm(adminId: string, code: string) {
  const ok = await adminHasPermission(adminId, code);
  if (!ok) {
    throw new AppError("FORBIDDEN", "Missing required permission.", 403);
  }
}

export async function listKycRequests(input: {
  adminId: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  await requirePerm(input.adminId, "kyc.read");
  const db = getDb();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  const query = db
    .select({
      request: verificationRequests,
      userEmail: users.email,
    })
    .from(verificationRequests)
    .innerJoin(users, eq(verificationRequests.userId, users.id));

  const rows = input.status
    ? await query
        .where(eq(verificationRequests.status, input.status))
        .orderBy(desc(verificationRequests.createdAt))
        .limit(limit)
        .offset(offset)
    : await query
        .orderBy(desc(verificationRequests.createdAt))
        .limit(limit)
        .offset(offset);

  return rows.map((r) => ({
    ...r.request,
    userEmail: r.userEmail,
  }));
}

export async function getKycRequest(adminId: string, requestId: string) {
  await requirePerm(adminId, "kyc.read");
  const db = getDb();
  const [row] = await db
    .select({
      request: verificationRequests,
      userEmail: users.email,
      userStatus: users.status,
    })
    .from(verificationRequests)
    .innerJoin(users, eq(verificationRequests.userId, users.id))
    .where(eq(verificationRequests.id, requestId))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Verification request not found.", 404);

  const documents = await db
    .select({
      id: verificationDocuments.id,
      documentType: verificationDocuments.documentType,
      fileName: verificationDocuments.fileName,
      contentType: verificationDocuments.contentType,
      byteSize: verificationDocuments.byteSize,
      createdAt: verificationDocuments.createdAt,
    })
    .from(verificationDocuments)
    .where(eq(verificationDocuments.verificationRequestId, requestId));

  return { ...row.request, userEmail: row.userEmail, userStatus: row.userStatus, documents };
}

export async function approveKyc(adminId: string, requestId: string) {
  await requirePerm(adminId, "kyc.approve");
  const db = getDb();
  const detail = await getKycRequest(adminId, requestId);
  if (!["PENDING", "UNDER_REVIEW"].includes(detail.status)) {
    throw new AppError(
      "VERIFICATION_INVALID_STATE",
      "Only pending requests can be approved.",
      400,
    );
  }

  const now = new Date();
  const before = { status: detail.status };
  const [updated] = await db
    .update(verificationRequests)
    .set({
      status: "APPROVED",
      reviewedAt: now,
      reviewedBy: adminId,
      updatedAt: now,
      rejectionReason: null,
    })
    .where(eq(verificationRequests.id, requestId))
    .returning();

  await db
    .update(users)
    .set({ status: "KYC_APPROVED", updatedAt: now })
    .where(eq(users.id, detail.userId));

  await db.insert(auditLogs).values({
    actorId: adminId,
    actorType: "ADMIN",
    action: "KYC_APPROVED",
    entityType: "verification_request",
    entityId: requestId,
    before,
    after: { status: "APPROVED" },
  });

  return updated!;
}

export async function rejectKyc(
  adminId: string,
  requestId: string,
  reason: string,
) {
  await requirePerm(adminId, "kyc.reject");
  if (!reason.trim()) {
    throw new AppError("VALIDATION_ERROR", "Rejection reason is required.", 400);
  }
  const detail = await getKycRequest(adminId, requestId);
  if (!["PENDING", "UNDER_REVIEW"].includes(detail.status)) {
    throw new AppError(
      "VERIFICATION_INVALID_STATE",
      "Only pending requests can be rejected.",
      400,
    );
  }

  const db = getDb();
  const now = new Date();
  const before = { status: detail.status };
  const [updated] = await db
    .update(verificationRequests)
    .set({
      status: "REJECTED",
      reviewedAt: now,
      reviewedBy: adminId,
      rejectionReason: reason.trim(),
      updatedAt: now,
    })
    .where(eq(verificationRequests.id, requestId))
    .returning();

  await db
    .update(users)
    .set({ status: "KYC_REJECTED", updatedAt: now })
    .where(eq(users.id, detail.userId));

  await db.insert(auditLogs).values({
    actorId: adminId,
    actorType: "ADMIN",
    action: "KYC_REJECTED",
    entityType: "verification_request",
    entityId: requestId,
    before,
    after: { status: "REJECTED", reason: reason.trim() },
    reason: reason.trim(),
  });

  return updated!;
}

export async function requestKycInfo(
  adminId: string,
  requestId: string,
  reason: string,
) {
  await requirePerm(adminId, "kyc.approve");
  if (!reason.trim()) {
    throw new AppError("VALIDATION_ERROR", "Reason is required.", 400);
  }
  const detail = await getKycRequest(adminId, requestId);
  if (!["PENDING", "UNDER_REVIEW"].includes(detail.status)) {
    throw new AppError(
      "VERIFICATION_INVALID_STATE",
      "Only pending requests can request more information.",
      400,
    );
  }

  const db = getDb();
  const now = new Date();
  const before = { status: detail.status };
  const [updated] = await db
    .update(verificationRequests)
    .set({
      status: "REQUIRES_INFORMATION",
      reviewedAt: now,
      reviewedBy: adminId,
      rejectionReason: reason.trim(),
      updatedAt: now,
    })
    .where(eq(verificationRequests.id, requestId))
    .returning();

  await db.insert(auditLogs).values({
    actorId: adminId,
    actorType: "ADMIN",
    action: "KYC_REQUIRES_INFORMATION",
    entityType: "verification_request",
    entityId: requestId,
    before,
    after: { status: "REQUIRES_INFORMATION", reason: reason.trim() },
    reason: reason.trim(),
  });

  return updated!;
}

export async function getKycDocumentBytes(adminId: string, docId: string) {
  await requirePerm(adminId, "kyc.read");
  const db = getDb();
  const [doc] = await db
    .select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.id, docId))
    .limit(1);
  if (!doc) throw new AppError("NOT_FOUND", "Document not found.", 404);
  const bytes = await getStorage().get(doc.storageKey);
  return { doc, bytes };
}
