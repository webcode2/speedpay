import { describe, expect, it } from "vitest";
import { canReinvestPreview, remainingReinvestable } from "./reinvest-service";

describe("remainingReinvestable", () => {
  it("returns full when nothing reinvested", () => {
    expect(remainingReinvestable(600_000, 0)).toBe(600_000);
  });

  it("subtracts prior", () => {
    expect(remainingReinvestable(600_000, 400_000)).toBe(200_000);
  });

  it("floors at zero", () => {
    expect(remainingReinvestable(600_000, 700_000)).toBe(0);
  });
});

describe("canReinvestPreview", () => {
  it("allows matured with remaining balance", () => {
    expect(canReinvestPreview({ status: "MATURED", remaining: 1 })).toBe(true);
  });

  it("blocks zero remaining or non-matured", () => {
    expect(canReinvestPreview({ status: "MATURED", remaining: 0 })).toBe(false);
    expect(canReinvestPreview({ status: "ACTIVE", remaining: 100 })).toBe(false);
  });
});
