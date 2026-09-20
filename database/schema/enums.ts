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

export const PAYOUT_ACCOUNT_STATUSES = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;

export type PayoutAccountStatus = (typeof PAYOUT_ACCOUNT_STATUSES)[number];

export const PROJECT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_DOCUMENT_KINDS = ["IMAGE", "DOCUMENT"] as const;

export type ProjectDocumentKind = (typeof PROJECT_DOCUMENT_KINDS)[number];

export const PACKAGE_STATUSES = [
  "DRAFT",
  "OPEN",
  "FULL",
  "PAUSED",
  "CLOSED",
  "ARCHIVED",
] as const;

export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export const RETURN_TYPES = ["FIXED_RETURN", "FIXED_PROFIT"] as const;

export type ReturnType = (typeof RETURN_TYPES)[number];

export const LEDGER_ACCOUNT_CODES = ["AVAILABLE", "PENDING"] as const;

export type LedgerAccountCode = (typeof LEDGER_ACCOUNT_CODES)[number];

export const WALLET_TX_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "INVESTMENT",
  "RETURN",
  "REVERSAL",
  "ADJUSTMENT",
] as const;

export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

export const WALLET_TX_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type WalletTxStatus = (typeof WALLET_TX_STATUSES)[number];

export const DEPOSIT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export const INVESTMENT_STATUSES = [
  "PENDING",
  "ACTIVE",
  "MATURED",
  "REINVESTED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type InvestmentStatus = (typeof INVESTMENT_STATUSES)[number];
