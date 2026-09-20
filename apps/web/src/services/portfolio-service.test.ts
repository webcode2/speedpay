import { describe, expect, it } from "vitest";
import { previewReturn } from "./portfolio-service";

describe("previewReturn", () => {
  it("computes expected and accrued linearly", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const maturity = new Date("2026-01-11T00:00:00.000Z");
    const mid = new Date("2026-01-06T00:00:00.000Z");
    const r = previewReturn({
      principal: 100000,
      returnRate: "10",
      startAt: start,
      maturityAt: maturity,
      now: mid,
    });
    expect(r.expectedReturn).toBe(10000);
    expect(r.maturityValue).toBe(110000);
    expect(r.percentageComplete).toBe(50);
    expect(r.accruedReturn).toBe(5000);
    expect(r.currentValue).toBe(105000);
    expect(r.isMature).toBe(false);
  });
});
