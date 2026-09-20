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
});
