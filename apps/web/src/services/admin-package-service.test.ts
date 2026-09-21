import { describe, expect, it } from "vitest";
import {
  availableLots,
  deriveInventoryStatus,
  validatePackageInput,
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

describe("validatePackageInput", () => {
  const base = {
    projectId: "x",
    name: "n",
    lotPrice: "100",
    totalLots: 1,
    returnType: "FIXED_RETURN",
    returnRate: "0.1",
    durationDays: 30,
    bannerImage: "packages/banners/a.jpg",
  };

  it("requires bannerImage", () => {
    expect(() => validatePackageInput({ ...base, bannerImage: "" })).toThrow(
      /Banner/,
    );
  });

  it("accepts valid input", () => {
    expect(() => validatePackageInput(base)).not.toThrow();
  });
});
