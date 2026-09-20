import { describe, expect, it } from "vitest";
import { canSubmitWithdrawal } from "./withdrawal-service";
import { assertValidPinFormat } from "./withdrawal-pin-service";
import { AppError } from "@/lib/app-error";

describe("canSubmitWithdrawal", () => {
  it("allows valid request", () => {
    expect(
      canSubmitWithdrawal({
        userStatus: "KYC_APPROVED",
        amount: 1000,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
      }),
    ).toBeNull();
  });

  it("blocks insufficient balance", () => {
    expect(
      canSubmitWithdrawal({
        userStatus: "KYC_APPROVED",
        amount: 6000,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
      }),
    ).toBe("INSUFFICIENT_BALANCE");
  });

  it("requires verified payout", () => {
    expect(
      canSubmitWithdrawal({
        userStatus: "KYC_APPROVED",
        amount: 1000,
        availableBalance: 5000,
        payoutStatus: "PENDING",
      }),
    ).toBe("PAYOUT_NOT_VERIFIED");
  });
});

describe("assertValidPinFormat", () => {
  it("accepts 4-6 digit pins", () => {
    expect(() => assertValidPinFormat("1234")).not.toThrow();
    expect(() => assertValidPinFormat("123456")).not.toThrow();
  });

  it("rejects invalid pins", () => {
    expect(() => assertValidPinFormat("12")).toThrow(AppError);
    expect(() => assertValidPinFormat("abcdef")).toThrow(AppError);
  });
});
