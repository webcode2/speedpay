import { describe, expect, it } from "vitest";
import { computeMaterializationDelta } from "./admin-returns-service";

describe("computeMaterializationDelta", () => {
  it("returns full accrued when nothing prior", () => {
    expect(computeMaterializationDelta(5000, 0)).toBe(5000);
  });

  it("returns incremental delta", () => {
    expect(computeMaterializationDelta(7500, 5000)).toBe(2500);
  });

  it("returns zero when fully materialized", () => {
    expect(computeMaterializationDelta(5000, 5000)).toBe(0);
  });

  it("rounds fractional accrued", () => {
    expect(computeMaterializationDelta(100.4, 0)).toBe(100);
  });
});
