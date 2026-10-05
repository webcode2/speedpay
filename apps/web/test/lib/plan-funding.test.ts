import { describe, expect, it } from "vitest";
import { planFunding } from "@/lib/plan-funding";

describe("planFunding", () => {
  it("computes expected, invested, and remaining raise", () => {
    expect(
      planFunding({ slotPrice: "1000", totalSlots: 100, soldSlots: 2 }),
    ).toEqual({
      expected: 100_000,
      invested: 2_000,
      remaining: 98_000,
      pct: 2,
      rate: 0,
      roiPerSlot: 0,
      expectedRoi: 0,
      investedRoi: 0,
    });
  });

  it("is complete when sold out", () => {
    const f = planFunding({ slotPrice: 2500, totalSlots: 20, soldSlots: 20 });
    expect(f.remaining).toBe(0);
    expect(f.pct).toBe(100);
  });

  it("computes expected ROI from return rate", () => {
    const f = planFunding({
      slotPrice: "1000",
      totalSlots: 100,
      soldSlots: 2,
      returnRate: "12",
    });
    expect(f.roiPerSlot).toBe(120);
    expect(f.expectedRoi).toBe(12_000);
    expect(f.investedRoi).toBe(240);
    expect(f.rate).toBe(12);
  });
});
