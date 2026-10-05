import { describe, expect, it } from "vitest";
import { assertValidPinFormat, maskEmail } from "@/services/withdrawal-pin-service";
import { AppError } from "@/lib/app-error";

describe("withdrawal-pin-service", () => {
  describe("maskEmail", () => {
    it("masks standard email addresses correctly", () => {
      expect(maskEmail("john.doe@example.com")).toBe("jo***e@example.com");
      expect(maskEmail("solar@investment.ng")).toBe("so***r@investment.ng");
    });

    it("handles short usernames gracefully", () => {
      expect(maskEmail("me@test.com")).toBe("m***@test.com");
      expect(maskEmail("a@test.com")).toBe("a***@test.com");
    });

    it("handles strings without domain gracefully", () => {
      expect(maskEmail("invalid-email")).toBe("invalid-email");
    });
  });

  describe("assertValidPinFormat", () => {
    it("accepts valid 4-digit and 6-digit numeric PINs", async () => {
      await expect(assertValidPinFormat("1234")).resolves.toBeUndefined();
      await expect(assertValidPinFormat("987654")).resolves.toBeUndefined();
      await expect(assertValidPinFormat("0000")).resolves.toBeUndefined();
    });

    it("rejects non-numeric characters and invalid lengths", async () => {
      await expect(assertValidPinFormat("123")).rejects.toBeInstanceOf(AppError);
      await expect(assertValidPinFormat("1234567")).rejects.toBeInstanceOf(AppError);
      await expect(assertValidPinFormat("12a4")).rejects.toBeInstanceOf(AppError);
      await expect(assertValidPinFormat("    ")).rejects.toBeInstanceOf(AppError);
      await expect(assertValidPinFormat("")).rejects.toBeInstanceOf(AppError);
    });
  });
});
