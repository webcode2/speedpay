import { describe, expect, it } from "vitest";
import { calculateInvestmentReturn } from "@/calculations/investment-return";

describe("portfolio uses return engine", () => {
  it("exposes engine outputs used by portfolio", () => {
    const r = calculateInvestmentReturn({
      principal: 50_000,
      startAt: new Date("2026-01-01T00:00:00.000Z"),
      maturityAt: new Date("2026-02-01T00:00:00.000Z"),
      returnType: "FIXED_RETURN",
      returnRate: "20",
      currentTime: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(r.expectedReturn).toBe(10_000);
    expect(r.maturityValue).toBe(60_000);
  });
});
