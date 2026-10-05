import { describe, expect, it } from "vitest";
import { hasAnyPermission } from "@/permissions/visibility";

describe("hasAnyPermission", () => {
  it("allows when required is empty", () => {
    expect(hasAnyPermission([], [])).toBe(true);
  });

  it("requires at least one matching code", () => {
    expect(hasAnyPermission(["users.read"], ["users.read", "kyc.read"])).toBe(
      true,
    );
    expect(hasAnyPermission(["audit.read"], ["users.read", "kyc.read"])).toBe(
      false,
    );
  });
});
