import { describe, expect, it } from "vitest";
import { maskAccountNumber } from "@/services/payout-account-service";

describe("maskAccountNumber", () => {
  it("masks all but last four digits", () => {
    expect(maskAccountNumber("1234567890")).toBe("******7890");
  });

  it("returns short numbers unchanged", () => {
    expect(maskAccountNumber("1234")).toBe("1234");
  });
});
