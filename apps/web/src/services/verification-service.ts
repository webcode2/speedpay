import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  users,
  verificationDocuments,
  verificationRequests,
} from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { getStorage } from "@/storage";
import { getProfile } from "@/services/profile-service";

const OPEN_STATUSES = [
  "NOT_STARTED",
  "PENDING",
  "UNDER_REVIEW",
  "REQUIRES_INFORMATION",
] as const;

const REQUIRED_DOCS = ["ID_FRONT", "SELFIE"] as const;

export async function getVerificationForUser(userId: string) {
  const db = getDb();
  const [request] = await db
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.userId, userId))
    .orderBy(desc(verificationRequests.createdAt))
    .limit(1);

  if (!request) {
    return { status: "NOT_STARTED" as const, request: null, documents: [] };
  }

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
    .where(eq(verificationDocuments.verificationRequestId, request.id));

  return { status: request.status, request, documents };
}

async function getOrCreateOpenRequest(userId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(verificationRequests)
    .where(
      and(
        eq(verificationRequests.userId, userId),
        inArray(verificationRequests.status, [...OPEN_STATUSES]),
      ),
    )
    .orderBy(desc(verificationRequests.createdAt))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(verificationRequests)
    .values({
      userId,
      status: "NOT_STARTED",
    })
    .returning();
  return created!;
}

export async function uploadVerificationDocument(input: {
  userId: string;
  documentType: string;
  fileName: string;
  contentType: string;
  bytes: Buffer;
}) {
  if (
    !["ID_FRONT", "ID_BACK", "SELFIE", "PROOF_OF_ADDRESS"].includes(
      input.documentType,
    )
  ) {
    throw new AppError("VALIDATION_ERROR", "Invalid document type.", 400);
  }

  const request = await getOrCreateOpenRequest(input.userId);
  if (request.status === "PENDING" || request.status === "UNDER_REVIEW") {
    throw new AppError(
      "VERIFICATION_INVALID_STATE",
      "Cannot upload documents while review is in progress.",
      400,
    );
  }

  const key = `kyc/${input.userId}/${request.id}/${input.documentType}-${randomUUID()}`;
  await getStorage().put(key, input.bytes, input.contentType);

  const db = getDb();
  const [doc] = await db
    .insert(verificationDocuments)
    .values({
      verificationRequestId: request.id,
      documentType: input.documentType,
      storageKey: key,
      fileName: input.fileName,
      contentType: input.contentType,
      byteSize: input.bytes.byteLength,
    })
    .returning();

  return doc!;
}

export async function submitVerification(userId: string) {
  const profile = await getProfile(userId);
  if (!profile.complete) {
    throw new AppError(
      "PROFILE_INCOMPLETE",
      "Complete your profile before submitting verification.",
      400,
    );
  }

  const request = await getOrCreateOpenRequest(userId);
  if (["PENDING", "UNDER_REVIEW", "APPROVED"].includes(request.status)) {
    throw new AppError(
      "VERIFICATION_INVALID_STATE",
      "Verification cannot be submitted in the current state.",
      400,
    );
  }

  const db = getDb();
  const docs = await db
    .select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.verificationRequestId, request.id));

  const types = new Set(docs.map((d) => d.documentType));
  for (const required of REQUIRED_DOCS) {
    if (!types.has(required)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Missing required document: ${required}`,
        400,
      );
    }
  }

  const now = new Date();
  const [updated] = await db
    .update(verificationRequests)
    .set({
      status: "PENDING",
      submittedAt: now,
      updatedAt: now,
      rejectionReason: null,
    })
    .where(eq(verificationRequests.id, request.id))
    .returning();

  await db
    .update(users)
    .set({ status: "KYC_PENDING", updatedAt: now })
    .where(and(eq(users.id, userId), ne(users.status, "KYC_APPROVED")));

  return updated!;
}
