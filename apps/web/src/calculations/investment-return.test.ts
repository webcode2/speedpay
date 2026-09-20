import { describe, expect, it } from "vitest";
import { calculateInvestmentReturn } from "./investment-return";

describe("calculateInvestmentReturn", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  const maturity = new Date("2026-01-11T00:00:00.000Z"); // 10 days

  it("computes full-term expected return for FIXED_RETURN", () => {
    const r = calculateInvestmentReturn({
      principal: 100_000,
      startAt: start,
      maturityAt: maturity,
      returnType: "FIXED_RETURN",
      returnRate: "10",
      currentTime: start,
    });
    expect(r.expectedReturn).toBe(10_000);
    expect(r.maturityValue).toBe(110_000);
    expect(r.accruedReturn).toBe(0);
    expect(r.currentValue).toBe(100_000);
    expect(r.percentageComplete).toBe(0);
    expect(r.isMature).toBe(false);
  });

  it("accrues linearly at midpoint", () => {
    const mid = new Date("2026-01-06T00:00:00.000Z");
    const r = calculateInvestmentReturn({
      principal: 100_000,
      startAt: start,
      maturityAt: maturity,
      returnType: "FIXED_PROFIT",
      returnRate: 10,
      currentTime: mid,
    });
    expect(r.percentageComplete).toBe(50);
    expect(r.accruedReturn).toBe(5_000);
    expect(r.currentValue).toBe(105_000);
    expect(r.isMature).toBe(false);
  });

  it("caps at maturity", () => {
    const after = new Date("2026-02-01T00:00:00.000Z");
    const r = calculateInvestmentReturn({
      principal: 100_000,
      startAt: start,
      maturityAt: maturity,
      returnType: "FIXED_RETURN",
      returnRate: "10%",
      currentTime: after,
    });
    expect(r.isMature).toBe(true);
    expect(r.percentageComplete).toBe(100);
    expect(r.accruedReturn).toBe(10_000);
    expect(r.currentValue).toBe(110_000);
    expect(r.elapsedMs).toBe(r.durationMs);
  });

  it("rejects unsupported return type", () => {
    expect(() =>
      calculateInvestmentReturn({
        principal: 1,
        startAt: start,
        maturityAt: maturity,
        returnType: "COMPOUND",
        returnRate: 5,
      }),
    ).toThrow(/Unsupported returnType/);
  });

  it("rejects inverted dates", () => {
    expect(() =>
      calculateInvestmentReturn({
        principal: 1,
        startAt: maturity,
        maturityAt: start,
        returnType: "FIXED_RETURN",
        returnRate: 5,
      }),
    ).toThrow(/maturityAt/);
  });
});
