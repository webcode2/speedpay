import { describe, expect, it } from "vitest";
import {
  availableLots,
  deriveInventoryStatus,
} from "./admin-package-service";

describe("package inventory helpers", () => {
  it("computes available lots", () => {
    expect(
      availableLots({ totalLots: 1000, reservedLots: 100, soldLots: 400 }),
    ).toBe(500);
  });

  it("marks FULL when none available", () => {
    expect(deriveInventoryStatus("OPEN", 0)).toBe("FULL");
  });

  it("reopens FULL when inventory returns", () => {
    expect(deriveInventoryStatus("FULL", 10)).toBe("OPEN");
  });
});
