import { describe, expect, it } from "vitest";
import {
  addDurationDays,
  formatDuration,
  fromDurationDays,
  toDurationDays,
} from "@/lib/plan-term";

describe("toDurationDays", () => {
  it("converts weeks and months the admin picks", () => {
    expect(toDurationDays(3, "weeks")).toBe(21);
    expect(toDurationDays(2, "months")).toBe(60);
    expect(toDurationDays(4, "months")).toBe(120);
    expect(toDurationDays(10, "days")).toBe(10);
  });
});

describe("fromDurationDays", () => {
  it("prefers months, then weeks", () => {
    expect(fromDurationDays(60)).toEqual({ value: 2, unit: "months" });
    expect(fromDurationDays(21)).toEqual({ value: 3, unit: "weeks" });
    expect(fromDurationDays(10)).toEqual({ value: 10, unit: "days" });
  });
});

describe("formatDuration", () => {
  it("labels the term", () => {
    expect(formatDuration(21)).toBe("3 weeks");
    expect(formatDuration(1)).toBe("1 day");
  });
});

describe("addDurationDays", () => {
  it("sets maturity from subscribe time", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    expect(addDurationDays(start, 21).toISOString()).toBe(
      "2026-01-22T00:00:00.000Z",
    );
  });
});
