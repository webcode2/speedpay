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
