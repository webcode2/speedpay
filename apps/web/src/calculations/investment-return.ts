export type ReturnType = "FIXED_RETURN" | "FIXED_PROFIT" | (string & {});

export type InvestmentReturnInput = {
  principal: number;
  startAt: Date;
  maturityAt: Date;
  returnType: ReturnType;
  returnRate: string | number;
  currentTime?: Date;
};

export type InvestmentReturnResult = {
  elapsedMs: number;
  durationMs: number;
  accruedReturn: number;
  currentValue: number;
  expectedReturn: number;
  maturityValue: number;
  percentageComplete: number;
  isMature: boolean;
  returnType: string;
};

function parseRate(returnRate: string | number): number {
  if (typeof returnRate === "number") {
    if (!Number.isFinite(returnRate) || returnRate < 0) {
      throw new Error("Invalid returnRate");
    }
    return returnRate;
  }
  const n = Number(String(returnRate).replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Invalid returnRate");
  }
  return n;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Server-side investment return calculation (on-demand, no cron).
 *
 * v1: FIXED_RETURN and FIXED_PROFIT both treat returnRate as a percent of
 * principal over the full term; accrual is linear with elapsed time.
 */
export function calculateInvestmentReturn(
  input: InvestmentReturnInput,
): InvestmentReturnResult {
  if (!Number.isFinite(input.principal) || input.principal < 0) {
    throw new Error("Invalid principal");
  }
  if (!(input.startAt instanceof Date) || Number.isNaN(input.startAt.getTime())) {
    throw new Error("Invalid startAt");
  }
  if (
    !(input.maturityAt instanceof Date) ||
    Number.isNaN(input.maturityAt.getTime())
  ) {
    throw new Error("Invalid maturityAt");
  }
  if (input.maturityAt.getTime() < input.startAt.getTime()) {
    throw new Error("maturityAt must be >= startAt");
  }

  const returnType = String(input.returnType || "FIXED_RETURN");
  if (returnType !== "FIXED_RETURN" && returnType !== "FIXED_PROFIT") {
    throw new Error(`Unsupported returnType: ${returnType}`);
  }

  const rate = parseRate(input.returnRate);
  const now = input.currentTime ?? new Date();
  const durationMs = Math.max(
    0,
    input.maturityAt.getTime() - input.startAt.getTime(),
  );
  const rawElapsed = now.getTime() - input.startAt.getTime();
  const elapsedMs = Math.min(Math.max(0, rawElapsed), durationMs || 0);
  const isMature = now.getTime() >= input.maturityAt.getTime();

  const expectedReturn = roundMoney((input.principal * rate) / 100);
  const maturityValue = roundMoney(input.principal + expectedReturn);

  const percentageComplete =
    durationMs <= 0
      ? 100
      : Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));

  const accruedReturn = isMature
    ? expectedReturn
    : roundMoney((expectedReturn * percentageComplete) / 100);
  const currentValue = roundMoney(input.principal + accruedReturn);

  return {
    elapsedMs,
    durationMs,
    accruedReturn,
    currentValue,
    expectedReturn,
    maturityValue,
    percentageComplete,
    isMature,
    returnType,
  };
}
