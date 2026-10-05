export function referralCodeFromId(id: string, attempt = 0): string {
  const hex = id.replace(/-/g, "").toUpperCase();
  if (attempt <= 0) return hex.slice(0, 8);
  const extra = hex.slice(8, 16);
  return (hex.slice(0, 6) + extra.slice(0, 2)).slice(0, 8);
}

export function normalizeInviteCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return code.length > 0 ? code : null;
}

export type AccountReferralStatus =
  | "REGISTERED"
  | "SUBSCRIBED"
  | "SUSPENDED"
  | "CLOSED";

export function accountReferralStatus(input: {
  userStatus: string;
  hasActiveInvestment: boolean;
}): AccountReferralStatus {
  if (input.userStatus === "SUSPENDED" || input.userStatus === "CLOSED") {
    return input.userStatus;
  }
  if (input.hasActiveInvestment) return "SUBSCRIBED";
  return "REGISTERED";
}

export type ReferrerStatus = "NONE" | "GROWING" | "ACTIVE";

export function referrerStatus(
  referred: { status: AccountReferralStatus }[],
): ReferrerStatus {
  if (referred.length === 0) return "NONE";
  if (referred.some((row) => row.status === "SUBSCRIBED")) return "ACTIVE";
  return "GROWING";
}

export const REFERRAL_COMMISSION_RATES = {
  A: 0.10, // 10%
  B: 0.02, // 2%
  C: 0.01, // 1%
} as const;

export function calculateReferralCommission(
  amount: number,
  level: keyof typeof REFERRAL_COMMISSION_RATES,
): number {
  const rate = REFERRAL_COMMISSION_RATES[level];
  return Math.round(amount * rate);
}
