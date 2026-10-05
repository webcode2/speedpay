import { describe, expect, it } from "vitest";
import { assertCanAllocateSlots } from "@/services/purchase-service";

describe("assertCanAllocateSlots", () => {
  it("allows valid allocation", () => {
    expect(
      assertCanAllocateSlots({
        slotCount: 2,
        minimumSlots: 1,
        maximumSlots: 10,
        available: 5,
      }),
    ).toBe("OK");
  });

  it("rejects oversell", () => {
    expect(
      assertCanAllocateSlots({
        slotCount: 6,
        minimumSlots: 1,
        maximumSlots: 10,
        available: 5,
      }),
    ).toBe("OVERSELL");
  });

  it("rejects below minimum", () => {
    expect(
      assertCanAllocateSlots({
        slotCount: 1,
        minimumSlots: 3,
        maximumSlots: null,
        available: 10,
      }),
    ).toBe("MIN");
  });

  it("rejects above maximum", () => {
    expect(
      assertCanAllocateSlots({
        slotCount: 8,
        minimumSlots: 1,
        maximumSlots: 5,
        available: 10,
      }),
    ).toBe("MAX");
  });
});
