import { calculateInvestmentReturn } from "@/calculations/investment-return";

export type ActiveInvestmentMoneyInput = {
  principal: number;
  returnRate: string;
  returnType: string;
  startAt: Date;
  maturityAt: Date;
};

export type DashboardMoney = {
  activePrincipal: number;
  expectedMaturityValue: number;
  maturedPrincipal: number;
  returnsCredited: number;
  walletLiability: number;
  pendingDepositAmount: number;
  pendingWithdrawalAmount: number;
  currency: string;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sumExpectedMaturityValue(
  rows: ActiveInvestmentMoneyInput[],
): number {
  let total = 0;
  for (const row of rows) {
    if (
      !(row.startAt instanceof Date) ||
      Number.isNaN(row.startAt.getTime()) ||
      !(row.maturityAt instanceof Date) ||
      Number.isNaN(row.maturityAt.getTime()) ||
      row.maturityAt.getTime() < row.startAt.getTime()
    ) {
      continue;
    }
    try {
      const calc = calculateInvestmentReturn({
        principal: row.principal,
        returnRate: row.returnRate,
        returnType: row.returnType,
        startAt: row.startAt,
        maturityAt: row.maturityAt,
      });
      total += calc.maturityValue;
    } catch {
      // Skip rows that fail rate/type validation.
    }
  }
  return roundMoney(total);
}

export function composeReturnsCredited(input: {
  maturedExpectedReturn: number;
  activeAccrualDelta: number;
}): number {
  return roundMoney(
    (Number(input.maturedExpectedReturn) || 0) +
      (Number(input.activeAccrualDelta) || 0),
  );
}

export function buildDashboardMoney(
  parts: {
    activePrincipal: number;
    maturedPrincipal: number;
    walletLiability: number;
    pendingDepositAmount: number;
    pendingWithdrawalAmount: number;
    maturedExpectedReturn: number;
    activeAccrualDelta: number;
    activeInvestments: ActiveInvestmentMoneyInput[];
    currency?: string;
  },
): DashboardMoney {
  return {
    activePrincipal: roundMoney(Number(parts.activePrincipal) || 0),
    expectedMaturityValue: sumExpectedMaturityValue(parts.activeInvestments),
    maturedPrincipal: roundMoney(Number(parts.maturedPrincipal) || 0),
    returnsCredited: composeReturnsCredited({
      maturedExpectedReturn: parts.maturedExpectedReturn,
      activeAccrualDelta: parts.activeAccrualDelta,
    }),
    walletLiability: roundMoney(Number(parts.walletLiability) || 0),
    pendingDepositAmount: roundMoney(Number(parts.pendingDepositAmount) || 0),
    pendingWithdrawalAmount: roundMoney(
      Number(parts.pendingWithdrawalAmount) || 0,
    ),
    currency: parts.currency ?? "NGN",
  };
}
