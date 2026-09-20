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

  it("requires KYC approval", () => {
    expect(
      canSubmitWithdrawal({
        userStatus: "EMAIL_UNVERIFIED",
        amount: 1000,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
      }),
    ).toBe("KYC_REQUIRED");
  });

  it("blocks restricted accounts", () => {
    expect(
      canSubmitWithdrawal({
        userStatus: "WITHDRAWAL_RESTRICTED",
        amount: 1000,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
      }),
    ).toBe("WITHDRAWAL_BLOCKED");
  });

  it("rejects negative and sub-minimum amounts", () => {
    expect(
      canSubmitWithdrawal({
        userStatus: "KYC_APPROVED",
        amount: -1,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
      }),
    ).toBe("INVALID_AMOUNT");
    expect(
      canSubmitWithdrawal({
        userStatus: "KYC_APPROVED",
        amount: 99,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
        minAmount: 100,
      }),
    ).toBe("INVALID_AMOUNT");
  });
});

describe("assertValidPinFormat", () => {
  it("accepts 4-6 digit pins", async () => {
    await expect(assertValidPinFormat("1234")).resolves.toBeUndefined();
    await expect(assertValidPinFormat("123456")).resolves.toBeUndefined();
  });

  it("rejects invalid pins", async () => {
    await expect(assertValidPinFormat("12")).rejects.toBeInstanceOf(AppError);
    await expect(assertValidPinFormat("abcdef")).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
