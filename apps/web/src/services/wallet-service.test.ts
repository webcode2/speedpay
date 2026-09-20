import { describe, expect, it } from "vitest";
import { sumBalances } from "./wallet-service";

describe("sumBalances", () => {
  it("aggregates available and pending", () => {
    expect(
      sumBalances([
        { code: "AVAILABLE", amount: 1000 },
        { code: "AVAILABLE", amount: -200 },
        { code: "PENDING", amount: 50 },
      ]),
    ).toEqual({ availableBalance: 800, pendingBalance: 50 });
  });
});
