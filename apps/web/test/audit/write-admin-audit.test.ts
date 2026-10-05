import { describe, expect, it } from "vitest";
import { auditValues } from "@/audit/write-admin-audit";

describe("auditValues", () => {
  it("maps admin audit fields including IP/UA", () => {
    expect(
      auditValues({
        actorId: "a1",
        action: "KYC_APPROVED",
        entityType: "verification_request",
        entityId: "r1",
        before: { status: "PENDING" },
        after: { status: "APPROVED" },
        meta: { ipAddress: "1.2.3.4", userAgent: "test" },
      }),
    ).toEqual({
      actorId: "a1",
      actorType: "ADMIN",
      action: "KYC_APPROVED",
      entityType: "verification_request",
      entityId: "r1",
      before: { status: "PENDING" },
      after: { status: "APPROVED" },
      reason: null,
      ipAddress: "1.2.3.4",
      userAgent: "test",
    });
  });
});
