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

export type ReturnSeriesPoint = {
  at: string;
  accruedReturn: number;
  currentValue: number;
};

/** Evenly spaced on-demand series from start → min(now, maturity). Not persisted. */
export function buildReturnSeries(
  input: InvestmentReturnInput,
  pointCount = 24,
): ReturnSeriesPoint[] {
  const now = input.currentTime ?? new Date();
  const endMs = Math.min(now.getTime(), input.maturityAt.getTime());
  const startMs = input.startAt.getTime();
  const count = Math.max(2, Math.min(60, Math.floor(pointCount)));

  if (endMs <= startMs) {
    const r = calculateInvestmentReturn({ ...input, currentTime: input.startAt });
    return [
      {
        at: input.startAt.toISOString(),
        accruedReturn: r.accruedReturn,
        currentValue: r.currentValue,
      },
    ];
  }

  const points: ReturnSeriesPoint[] = [];
  for (let i = 0; i < count; i++) {
    const t = startMs + ((endMs - startMs) * i) / (count - 1);
    const at = new Date(t);
    const r = calculateInvestmentReturn({ ...input, currentTime: at });
    points.push({
      at: at.toISOString(),
      accruedReturn: r.accruedReturn,
      currentValue: r.currentValue,
    });
  }
  return points;
}

/** Accrued since start of UTC day (or since startAt if later). */
export function calculateTodayReturn(
  input: Omit<InvestmentReturnInput, "currentTime">,
  now = new Date(),
): number {
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const baselineAt =
    dayStart.getTime() < input.startAt.getTime() ? input.startAt : dayStart;
  const atStart = calculateInvestmentReturn({
    ...input,
    currentTime: baselineAt,
  });
  const atNow = calculateInvestmentReturn({ ...input, currentTime: now });
  return roundMoney(atNow.accruedReturn - atStart.accruedReturn);
}
