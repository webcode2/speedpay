import { describe, expect, it } from "vitest";
import {
  fillDailySeries,
  formatCompactAmount,
  seriesForPeriod,
} from "@/lib/dashboard-charts";

describe("fillDailySeries", () => {
  it("fills missing days with zero and keeps known amounts", () => {
    const filled = fillDailySeries(
      [
        { date: "2026-09-18", amount: 100 },
        { date: "2026-09-20", amount: 50 },
      ],
      "2026-09-18",
      "2026-09-21",
    );
    expect(filled).toEqual([
      { date: "2026-09-18", amount: 100 },
      { date: "2026-09-19", amount: 0 },
      { date: "2026-09-20", amount: 50 },
      { date: "2026-09-21", amount: 0 },
    ]);
  });

  it("sums duplicate dates", () => {
    const filled = fillDailySeries(
      [
        { date: "2026-09-18", amount: 40 },
        { date: "2026-09-18", amount: 10 },
      ],
      "2026-09-18",
      "2026-09-18",
    );
    expect(filled).toEqual([{ date: "2026-09-18", amount: 50 }]);
  });
});

describe("seriesForPeriod", () => {
  it("returns 7 inclusive days for week", () => {
    const series = seriesForPeriod(
      [{ date: "2026-09-21", amount: 12 }],
      "week",
      "2026-09-21",
    );
    expect(series).toHaveLength(7);
    expect(series[0]?.date).toBe("2026-09-15");
    expect(series[6]).toEqual({ date: "2026-09-21", amount: 12 });
  });

  it("returns 30, 90, and 365 days for the longer filters", () => {
    expect(seriesForPeriod([], "month", "2026-09-21")).toHaveLength(30);
    expect(seriesForPeriod([], "quarter", "2026-09-21")).toHaveLength(90);
    expect(seriesForPeriod([], "year", "2026-09-21")).toHaveLength(365);
  });
});

describe("formatCompactAmount", () => {
  it("shortens thousands and millions", () => {
    expect(formatCompactAmount(950)).toBe("950");
    expect(formatCompactAmount(1_250)).toBe("1.3k");
    expect(formatCompactAmount(2_400_000)).toBe("2.4M");
  });
});
