import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSION_CODES,
  PERMISSION_CATALOG,
  ROLE_CATALOG,
  ROLE_PERMISSION_CODES,
} from "./catalog";

describe("seed catalog", () => {
  it("includes all required permission codes", () => {
    const codes = PERMISSION_CATALOG.map((p) => p.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "users.read",
        "users.update",
        "users.disable",
        "kyc.read",
        "kyc.approve",
        "kyc.reject",
        "projects.create",
        "projects.update",
        "projects.publish",
        "packages.create",
        "packages.update",
        "packages.activate",
        "packages.pause",
        "investments.read",
        "investments.update",
        "withdrawals.read",
        "withdrawals.approve",
        "withdrawals.reject",
        "withdrawals.process",
        "returns.read",
        "returns.calculate",
        "maturities.read",
        "maturities.process",
        "staff.create",
        "staff.update",
        "roles.read",
        "roles.update",
        "audit.read",
      ]),
    );
    expect(codes).toHaveLength(28);
  });

  it("includes seven roles", () => {
    expect(ROLE_CATALOG.map((r) => r.code)).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
      "CUSTOMER_SUPPORT",
      "ACCOUNTANT",
      "FINANCE_OFFICER",
      "INVESTMENT_MANAGER",
      "KYC_OFFICER",
    ]);
  });

  it("gives SUPER_ADMIN and ADMIN every permission", () => {
    expect(ROLE_PERMISSION_CODES.SUPER_ADMIN).toEqual(ALL_PERMISSION_CODES);
    expect(ROLE_PERMISSION_CODES.ADMIN).toEqual(ALL_PERMISSION_CODES);
  });

  it("maps KYC_OFFICER to kyc permissions only", () => {
    expect(ROLE_PERMISSION_CODES.KYC_OFFICER).toEqual([
      "kyc.read",
      "kyc.approve",
      "kyc.reject",
    ]);
  });
});
