import { describe, expect, it } from "vitest";
import { getBearerToken, requestMeta } from "@/auth/request";
import {
  assertSameOwner,
  idempotencyDecision,
  isSessionLive,
  requirePermissionCodes,
  validateDepositAmount,
  validateLotCount,
} from "@/lib/integrity";
import { isPackageWithinWindow } from "@/lib/package-window";
import { availableLots } from "@/services/admin-package-service";
import { canProcessMaturity } from "@/services/admin-maturity-service";
import { assertCanAllocateLots } from "@/services/purchase-service";
import {
  canReinvestPreview,
  remainingReinvestable,
} from "@/services/reinvest-service";
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
    expect(validateLotCount(0)).toBe("INVALID_LOT_COUNT");
    expect(validateLotCount(-1)).toBe("INVALID_LOT_COUNT");
    expect(validateLotCount(1.5)).toBe("INVALID_LOT_COUNT");
    expect(validateLotCount(2)).toBe("OK");
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
  it("availableLots drives oversell rejection", () => {
    const available = availableLots({
      totalLots: 10,
      soldLots: 8,
      reservedLots: 0,
    });
    expect(available).toBe(2);
    expect(
      assertCanAllocateLots({
        lotCount: 3,
        minimumLots: 1,
        maximumLots: 10,
        available,
      }),
    ).toBe("OVERSELL");
    expect(
      assertCanAllocateLots({
        lotCount: 2,
        minimumLots: 1,
        maximumLots: 10,
        available,
      }),
    ).toBe("OK");
  });

  it("enforces min/max lots", () => {
    expect(
      assertCanAllocateLots({
        lotCount: 1,
        minimumLots: 2,
        maximumLots: 5,
        available: 10,
      }),
    ).toBe("MIN");
    expect(
      assertCanAllocateLots({
        lotCount: 6,
        minimumLots: 1,
        maximumLots: 5,
        available: 10,
      }),
    ).toBe("MAX");
  });
});

describe("duplicate maturity / reinvest", () => {
  it("blocks already-processed maturity", () => {
    expect(
      canProcessMaturity({
        status: "ACTIVE",
        maturityAt: new Date("2026-01-01"),
        alreadyProcessed: true,
        now: new Date("2026-02-01"),
      }),
    ).toBe("ALREADY_PROCESSED");
  });

  it("blocks early maturity", () => {
    expect(
      canProcessMaturity({
        status: "ACTIVE",
        maturityAt: new Date("2026-12-01"),
        alreadyProcessed: false,
        now: new Date("2026-02-01"),
      }),
    ).toBe("NOT_DUE");
  });

  it("reinvest eligibility and remaining cap", () => {
    expect(remainingReinvestable(1000, 400)).toBe(600);
    expect(remainingReinvestable(1000, 1000)).toBe(0);
    expect(canReinvestPreview({ status: "MATURED", remaining: 100 })).toBe(
      true,
    );
    expect(canReinvestPreview({ status: "MATURED", remaining: 0 })).toBe(false);
    expect(canReinvestPreview({ status: "REINVESTED", remaining: 100 })).toBe(
      false,
    );
  });
});

describe("package availability window", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  it("is open inside window", () => {
    expect(
      isPackageWithinWindow(
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
      isPackageWithinWindow(
        {
          availableFrom: new Date("2026-07-01"),
          availableUntil: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isPackageWithinWindow(
        {
          availableFrom: null,
          availableUntil: new Date("2026-06-01"),
        },
        now,
      ),
    ).toBe(false);
  });
});
