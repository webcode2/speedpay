import { describe, expect, it } from "vitest";
import {
  accruedRoiDays,
  dueRoiDays,
  nextRoiDate,
  planDailyProfit,
  utcDate,
} from "@/lib/daily-roi";

describe("dueRoiDays", () => {
  it("does not credit on the subscribe day", () => {
    expect(
      dueRoiDays({
        lastRoiOn: "2026-09-28",
        startAt: new Date("2026-09-28T15:00:00.000Z"),
        now: new Date("2026-09-28T23:00:00.000Z"),
      }).days,
    ).toBe(0);
  });

  it("credits the next UTC day once", () => {
    expect(
      dueRoiDays({
        lastRoiOn: "2026-09-28",
        startAt: new Date("2026-09-28T15:00:00.000Z"),
        now: new Date("2026-09-29T00:30:00.000Z"),
      }),
    ).toEqual({ days: 1, from: "2026-09-29", to: "2026-09-29" });
  });

  it("catches up missed days and caps them", () => {
    const due = dueRoiDays({
      lastRoiOn: "2026-09-20",
      startAt: new Date("2026-09-20T12:00:00.000Z"),
      now: new Date("2026-09-28T12:00:00.000Z"),
    });
    expect(due.days).toBe(8);
    expect(due.from).toBe("2026-09-21");
    expect(due.to).toBe("2026-09-28");
    expect(
      dueRoiDays({
        lastRoiOn: "2026-01-01",
        startAt: new Date("2026-01-01T00:00:00.000Z"),
        now: new Date("2026-09-28T00:00:00.000Z"),
        maxDays: 10,
      }).days,
    ).toBe(10);
  });

  it("treats a missing lastRoiOn as the start date", () => {
    expect(
      dueRoiDays({
        lastRoiOn: null,
        startAt: new Date("2026-09-27T18:00:00.000Z"),
        now: new Date("2026-09-28T01:00:00.000Z"),
      }).days,
    ).toBe(1);
  });
});

describe("accruedRoiDays", () => {
  it("counts credited days after subscribe", () => {
    expect(
      accruedRoiDays({
        lastRoiOn: "2026-09-30",
        startAt: new Date("2026-09-28T12:00:00.000Z"),
      }),
    ).toBe(2);
  });
});

describe("nextRoiDate", () => {
  it("is the day after subscribe when nothing has been credited", () => {
    expect(
      nextRoiDate({
        lastRoiOn: null,
        startAt: new Date("2026-09-28T15:00:00.000Z"),
        now: new Date("2026-09-28T20:00:00.000Z"),
      }),
    ).toEqual({ nextOn: "2026-09-29", pendingDays: 0 });
  });

  it("flags pending days when ROI is already due", () => {
    expect(
      nextRoiDate({
        lastRoiOn: "2026-09-28",
        startAt: new Date("2026-09-28T15:00:00.000Z"),
        now: new Date("2026-09-30T08:00:00.000Z"),
      }),
    ).toEqual({ nextOn: "2026-09-29", pendingDays: 2 });
  });
});

describe("planDailyProfit", () => {
  it("is only the extra from that plan’s daily reviews", () => {
    expect(
      planDailyProfit({
        dailyTaskLimit: 1,
        taskReward: 0,
      }),
    ).toBe(0);
    expect(
      planDailyProfit({
        dailyTaskLimit: 4,
        taskReward: 800,
      }),
    ).toBe(3200);
  });
});

describe("utcDate", () => {
  it("uses the UTC calendar day", () => {
    expect(utcDate(new Date("2026-09-28T23:30:00.000-05:00"))).toBe("2026-09-29");
  });
});
