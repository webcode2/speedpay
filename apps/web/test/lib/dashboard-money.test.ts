import { describe, expect, it } from "vitest";
import {
  buildDashboardMoney,
  composeReturnsCredited,
  sumExpectedMaturityValue,
} from "@/lib/dashboard-money";

describe("sumExpectedMaturityValue", () => {
  it("sums active principal values", () => {
    const total = sumExpectedMaturityValue([
      { principal: 1000 },
      { principal: 500 },
    ]);
    expect(total).toBe(1500);
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
    const money = buildDashboardMoney({
      activePrincipal: 1000,
      maturedPrincipal: 2000,
      walletLiability: 1500,
      pendingDepositAmount: 100,
      pendingWithdrawalAmount: 50,
      maturedExpectedReturn: 200,
      activeAccrualDelta: 25,
      activeInvestments: [{ principal: 1000 }],
    });
    expect(money).toEqual({
      activePrincipal: 1000,
      expectedMaturityValue: 1000,
      maturedPrincipal: 2000,
      returnsCredited: 225,
      walletLiability: 1500,
      pendingDepositAmount: 100,
      pendingWithdrawalAmount: 50,
      currency: "NGN",
    });
  });
});
