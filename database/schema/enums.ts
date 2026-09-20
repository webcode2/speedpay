export const USER_STATUSES = [
  "REGISTERED",
  "EMAIL_UNVERIFIED",
  "PHONE_UNVERIFIED",
  "KYC_PENDING",
  "KYC_APPROVED",
  "KYC_REJECTED",
  "INVESTMENT_RESTRICTED",
  "WITHDRAWAL_RESTRICTED",
  "SUSPENDED",
  "CLOSED",
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const ADMIN_STATUSES = ["ACTIVE", "DISABLED", "INVITED"] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export const AUDIT_ACTOR_TYPES = ["ADMIN", "USER", "SYSTEM"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const VERIFICATION_STATUSES = [
  "NOT_STARTED",
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "REQUIRES_INFORMATION",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_DOCUMENT_TYPES = [
  "ID_FRONT",
  "ID_BACK",
  "SELFIE",
  "PROOF_OF_ADDRESS",
] as const;

export type VerificationDocumentType =
  (typeof VERIFICATION_DOCUMENT_TYPES)[number];
