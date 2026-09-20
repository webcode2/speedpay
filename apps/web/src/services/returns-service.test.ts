import { describe, expect, it } from "vitest";
import {
  buildReturnSeries,
  calculateTodayReturn,
} from "@/calculations/investment-return";

describe("returns UI helpers", () => {
  it("series length defaults near 24", () => {
    const series = buildReturnSeries({
      principal: 10_000,
      startAt: new Date("2026-01-01T00:00:00.000Z"),
      maturityAt: new Date("2026-02-01T00:00:00.000Z"),
      returnType: "FIXED_RETURN",
      returnRate: 10,
      currentTime: new Date("2026-01-15T00:00:00.000Z"),
    });
    expect(series.length).toBe(24);
  });

  it("today return is zero before start", () => {
    const r = calculateTodayReturn(
      {
        principal: 10_000,
        startAt: new Date("2026-06-01T00:00:00.000Z"),
        maturityAt: new Date("2026-07-01T00:00:00.000Z"),
        returnType: "FIXED_RETURN",
        returnRate: 10,
      },
      new Date("2026-01-01T12:00:00.000Z"),
    );
    expect(r).toBe(0);
  });
});
