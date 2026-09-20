import { describe, expect, it } from "vitest";
import { assertCanAllocateLots } from "./purchase-service";

describe("assertCanAllocateLots", () => {
  it("allows valid allocation", () => {
    expect(
      assertCanAllocateLots({
        lotCount: 2,
        minimumLots: 1,
        maximumLots: 10,
        available: 5,
      }),
    ).toBe("OK");
  });

  it("rejects oversell", () => {
    expect(
      assertCanAllocateLots({
        lotCount: 6,
        minimumLots: 1,
        maximumLots: 10,
        available: 5,
      }),
    ).toBe("OVERSELL");
  });

  it("rejects below minimum", () => {
    expect(
      assertCanAllocateLots({
        lotCount: 1,
        minimumLots: 3,
        maximumLots: null,
        available: 10,
      }),
    ).toBe("MIN");
  });

  it("rejects above maximum", () => {
    expect(
      assertCanAllocateLots({
        lotCount: 8,
        minimumLots: 1,
        maximumLots: 5,
        available: 10,
      }),
    ).toBe("MAX");
  });
});
