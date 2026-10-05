import { describe, expect, it } from "vitest";
import { getBearerToken, requestMeta } from "@/auth/request";
import {
  assertSameOwner,
  idempotencyDecision,
  isSessionLive,
  requirePermissionCodes,
  validateDepositAmount,
  validateSlotCount,
} from "@/lib/integrity";
import { isPlanWithinWindow } from "@/lib/plan-window";
import { availableSlots } from "@/services/admin-plan-service";
import { assertCanAllocateSlots } from "@/services/purchase-service";
import { canSubmitWithdrawal } from "@/services/withdrawal-service";
import { hasAnyPermission } from "@/permissions/visibility";

describe("authentication token parsing", () => {
  it("extracts bearer tokens", () => {
    const req = new Request("http://localhost/api", {
      headers: { authorization: "Bearer abc.def" },
    });
    expect(getBearerToken(req)).toBe("abc.def");
  });

  it("rejects missing or malformed authorization", () => {
    expect(getBearerToken(new Request("http://localhost"))).toBeNull();
    expect(
      getBearerToken(
        new Request("http://localhost", {
          headers: { authorization: "Basic x" },
        }),
      ),
    ).toBeNull();
  });

  it("reads request meta for audit", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        "user-agent": "vitest",
      },
    });
    expect(requestMeta(req)).toEqual({
      ipAddress: "1.2.3.4",
      userAgent: "vitest",
    });
  });
});

describe("session expiration / revocation", () => {
  const now = new Date("2026-09-20T12:00:00Z");

  it("accepts live sessions", () => {
    expect(
      isSessionLive({
        expiresAt: new Date("2026-09-21T12:00:00Z"),
        revokedAt: null,
        now,
      }),
    ).toBe(true);
  });

  it("rejects expired sessions", () => {
    expect(
      isSessionLive({
        expiresAt: new Date("2026-09-19T12:00:00Z"),
        revokedAt: null,
        now,
      }),
    ).toBe(false);
  });

  it("rejects revoked sessions even if unexpired", () => {
    expect(
      isSessionLive({
        expiresAt: new Date("2026-09-21T12:00:00Z"),
        revokedAt: new Date("2026-09-20T11:00:00Z"),
        now,
      }),
    ).toBe(false);
  });
});

describe("authorization / permissions", () => {
  it("requires held permission codes", () => {
    expect(requirePermissionCodes(["users.read"], "users.read")).toBe("OK");
    expect(requirePermissionCodes(["users.read"], "withdrawals.process")).toBe(
      "FORBIDDEN",
    );
  });

  it("nav visibility uses any-of semantics", () => {
    expect(hasAnyPermission(["kyc.read"], ["kyc.read", "kyc.review"])).toBe(
      true,
    );
    expect(hasAnyPermission(["users.read"], ["kyc.read"])).toBe(false);
  });
});

describe("ownership / tampered ids", () => {
  it("allows same owner", () => {
    expect(assertSameOwner("user-a", "user-a")).toBe("OK");
  });

  it("forbids cross-user access (tampered id)", () => {
    expect(assertSameOwner("user-a", "user-b")).toBe("FORBIDDEN");
  });
});

describe("idempotency / duplicate requests", () => {
  it("replays when a prior row exists", () => {
    expect(idempotencyDecision({ id: "existing" }).replay).toBe(true);
  });

  it("proceeds when no prior row", () => {
    expect(idempotencyDecision(null).replay).toBe(false);
    expect(idempotencyDecision(undefined).replay).toBe(false);
  });
});

describe("invalid / negative financial amounts", () => {
  it("rejects bad lot counts", () => {
    expect(validateSlotCount(0)).toBe("INVALID_SLOT_COUNT");
    expect(validateSlotCount(-1)).toBe("INVALID_SLOT_COUNT");
    expect(validateSlotCount(1.5)).toBe("INVALID_SLOT_COUNT");
    expect(validateSlotCount(2)).toBe("OK");
  });

  it("rejects invalid deposits", () => {
    expect(validateDepositAmount(50, 100)).toBe("INVALID_AMOUNT");
    expect(validateDepositAmount(-100, 100)).toBe("INVALID_AMOUNT");
    expect(validateDepositAmount(100.5, 100)).toBe("INVALID_AMOUNT");
    expect(validateDepositAmount(100, 100)).toBe("OK");
  });

  it("rejects invalid withdrawals", () => {
    expect(
      canSubmitWithdrawal({
        userStatus: "KYC_APPROVED",
        amount: 0,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
      }),
    ).toBe("INVALID_AMOUNT");
    expect(
      canSubmitWithdrawal({
        userStatus: "KYC_APPROVED",
        amount: -10,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
      }),
    ).toBe("INVALID_AMOUNT");
    expect(
      canSubmitWithdrawal({
        userStatus: "KYC_APPROVED",
        amount: 50,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
        minAmount: 100,
      }),
    ).toBe("INVALID_AMOUNT");
  });
});

describe("withdrawal authz gates", () => {
  it("requires KYC", () => {
    expect(
      canSubmitWithdrawal({
        userStatus: "ACTIVE",
        amount: 1000,
        availableBalance: 5000,
        payoutStatus: "VERIFIED",
      }),
    ).toBe("KYC_REQUIRED");
  });

  it("blocks restricted / suspended / closed before KYC check", () => {
    for (const userStatus of [
      "WITHDRAWAL_RESTRICTED",
      "SUSPENDED",
      "CLOSED",
    ]) {
      expect(
        canSubmitWithdrawal({
          userStatus,
          amount: 1000,
          availableBalance: 5000,
          payoutStatus: "VERIFIED",
        }),
      ).toBe("WITHDRAWAL_BLOCKED");
    }
  });
});

describe("concurrent lot purchases / oversell", () => {
  it("availableSlots drives oversell rejection", () => {
    const available = availableSlots({
      totalSlots: 10,
      soldSlots: 8,
      reservedSlots: 0,
    });
    expect(available).toBe(2);
    expect(
      assertCanAllocateSlots({
        slotCount: 3,
        minimumSlots: 1,
        maximumSlots: 10,
        available,
      }),
    ).toBe("OVERSELL");
    expect(
      assertCanAllocateSlots({
        slotCount: 2,
        minimumSlots: 1,
        maximumSlots: 10,
        available,
      }),
    ).toBe("OK");
  });

  it("enforces min/max lots", () => {
    expect(
      assertCanAllocateSlots({
        slotCount: 1,
        minimumSlots: 2,
        maximumSlots: 5,
        available: 10,
      }),
    ).toBe("MIN");
    expect(
      assertCanAllocateSlots({
        slotCount: 6,
        minimumSlots: 1,
        maximumSlots: 5,
        available: 10,
      }),
    ).toBe("MAX");
  });
});

describe("package availability window", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  it("is open inside window", () => {
    expect(
      isPlanWithinWindow(
        {
          availableFrom: new Date("2026-01-01"),
          availableUntil: new Date("2026-12-31"),
        },
        now,
      ),
    ).toBe(true);
  });

  it("is closed outside window", () => {
    expect(
      isPlanWithinWindow(
        {
          availableFrom: new Date("2026-07-01"),
          availableUntil: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isPlanWithinWindow(
        {
          availableFrom: null,
          availableUntil: new Date("2026-06-01"),
        },
        now,
      ),
    ).toBe(false);
  });
});
