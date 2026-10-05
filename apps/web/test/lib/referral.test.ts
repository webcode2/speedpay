import { describe, expect, it } from "vitest";
import {
  accountReferralStatus,
  calculateReferralCommission,
  normalizeInviteCode,
  referralCodeFromId,
  referrerStatus,
} from "@/lib/referral";

describe("referralCodeFromId", () => {
  it("uses the first 8 hex characters of a uuid", () => {
    expect(referralCodeFromId("1f44c817-79a3-42ff-9a20-1d44bc1a4094")).toBe(
      "1F44C817",
    );
  });
});

describe("normalizeInviteCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeInviteCode("  ab12cd34  ")).toBe("AB12CD34");
  });

  it("treats blank as missing", () => {
    expect(normalizeInviteCode("   ")).toBeNull();
    expect(normalizeInviteCode(null)).toBeNull();
  });
});

describe("accountReferralStatus", () => {
  it("marks subscribed investors", () => {
    expect(
      accountReferralStatus({
        userStatus: "ACTIVE",
        hasActiveInvestment: true,
      }),
    ).toBe("SUBSCRIBED");
  });
});

describe("referrerStatus", () => {
  it("is NONE with no downline", () => {
    expect(referrerStatus([])).toBe("NONE");
  });

  it("is ACTIVE once someone subscribed", () => {
    expect(
      referrerStatus([
        { status: "REGISTERED" },
        { status: "SUBSCRIBED" },
      ]),
    ).toBe("ACTIVE");
  });
});

describe("calculateReferralCommission", () => {
  it("calculates 10% for Level A", () => {
    expect(calculateReferralCommission(12_000, "A")).toBe(1_200);
    expect(calculateReferralCommission(54_000, "A")).toBe(5_400);
    expect(calculateReferralCommission(1_000_000, "A")).toBe(100_000);
  });

  it("calculates 2% for Level B", () => {
    expect(calculateReferralCommission(12_000, "B")).toBe(240);
    expect(calculateReferralCommission(54_000, "B")).toBe(1_080);
    expect(calculateReferralCommission(1_000_000, "B")).toBe(20_000);
  });

  it("calculates 1% for Level C", () => {
    expect(calculateReferralCommission(12_000, "C")).toBe(120);
    expect(calculateReferralCommission(54_000, "C")).toBe(540);
    expect(calculateReferralCommission(1_000_000, "C")).toBe(10_000);
  });
});
