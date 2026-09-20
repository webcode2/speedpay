import { describe, expect, it } from "vitest";
import { canProcessMaturity } from "./admin-maturity-service";

describe("canProcessMaturity", () => {
  const maturityAt = new Date("2026-01-10T00:00:00.000Z");

  it("allows active due investment", () => {
    expect(
      canProcessMaturity({
        status: "ACTIVE",
        maturityAt,
        now: new Date("2026-01-11T00:00:00.000Z"),
        alreadyProcessed: false,
      }),
    ).toBeNull();
  });

  it("blocks early process", () => {
    expect(
      canProcessMaturity({
        status: "ACTIVE",
        maturityAt,
        now: new Date("2026-01-01T00:00:00.000Z"),
        alreadyProcessed: false,
      }),
    ).toBe("NOT_DUE");
  });

  it("blocks duplicate", () => {
    expect(
      canProcessMaturity({
        status: "ACTIVE",
        maturityAt,
        now: new Date("2026-01-11T00:00:00.000Z"),
        alreadyProcessed: true,
      }),
    ).toBe("ALREADY_PROCESSED");
  });

  it("blocks non-active", () => {
    expect(
      canProcessMaturity({
        status: "MATURED",
        maturityAt,
        now: new Date("2026-01-11T00:00:00.000Z"),
        alreadyProcessed: false,
      }),
    ).toBe("NOT_ACTIVE");
  });
});
