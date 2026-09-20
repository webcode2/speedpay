import { describe, expect, it } from "vitest";
import { remainingReinvestable } from "./reinvest-service";

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
