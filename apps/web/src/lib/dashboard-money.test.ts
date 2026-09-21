import { describe, expect, it } from "vitest";
import {
  buildDashboardMoney,
  composeReturnsCredited,
  sumExpectedMaturityValue,
} from "@/lib/dashboard-money";

describe("sumExpectedMaturityValue", () => {
  it("sums maturityValue for valid ACTIVE rows (10% of 1000 → 1100)", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const maturity = new Date("2026-07-01T00:00:00.000Z");
    const total = sumExpectedMaturityValue([
      {
        principal: 1000,
        returnRate: "10",
        returnType: "FIXED_RETURN",
        startAt: start,
        maturityAt: maturity,
      },
      {
        principal: 500,
        returnRate: "20",
        returnType: "FIXED_RETURN",
        startAt: start,
        maturityAt: maturity,
      },
    ]);
    // 1000+100 + 500+100 = 1700
    expect(total).toBe(1700);
  });

  it("skips corrupt rows where maturityAt < startAt", () => {
    const start = new Date("2026-07-01T00:00:00.000Z");
    const maturity = new Date("2026-01-01T00:00:00.000Z");
    const total = sumExpectedMaturityValue([
      {
        principal: 1000,
        returnRate: "10",
        returnType: "FIXED_RETURN",
        startAt: start,
        maturityAt: maturity,
      },
    ]);
    expect(total).toBe(0);
  });
});

describe("composeReturnsCredited", () => {
  it("adds matured expected return and ACTIVE-only accrual deltas", () => {
    expect(
      composeReturnsCredited({
        maturedExpectedReturn: 250,
        activeAccrualDelta: 40,
      }),
    ).toBe(290);
  });
});

describe("buildDashboardMoney", () => {
  it("assembles the money payload", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const maturity = new Date("2026-07-01T00:00:00.000Z");
    const money = buildDashboardMoney({
      activePrincipal: 1000,
      maturedPrincipal: 2000,
      walletLiability: 1500,
      pendingDepositAmount: 100,
      pendingWithdrawalAmount: 50,
      maturedExpectedReturn: 200,
      activeAccrualDelta: 25,
      activeInvestments: [
        {
          principal: 1000,
          returnRate: "10",
          returnType: "FIXED_RETURN",
          startAt: start,
          maturityAt: maturity,
        },
      ],
    });
    expect(money).toEqual({
      activePrincipal: 1000,
      expectedMaturityValue: 1100,
      maturedPrincipal: 2000,
      returnsCredited: 225,
      walletLiability: 1500,
      pendingDepositAmount: 100,
      pendingWithdrawalAmount: 50,
      currency: "NGN",
    });
  });
});
