import { describe, expect, it } from "vitest";
import { quoteInvestment } from "./marketplace-service";

describe("quoteInvestment", () => {
  it("computes principal and expected return", () => {
    const q = quoteInvestment({
      lotCount: 2,
      lotPrice: "100000",
      returnRate: "12",
      durationDays: 365,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(q.principal).toBe(200000);
    expect(q.expectedReturn).toBe(24000);
    expect(q.maturityValue).toBe(224000);
    expect(q.maturityAt).toBe("2027-01-01T00:00:00.000Z");
  });
});
