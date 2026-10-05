export function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addUtcDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDate(d);
}

export function daysBetweenUtc(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

/** First credit is the calendar day after subscribe. `lastRoiOn` is the last credited UTC date. */
export function dueRoiDays(input: {
  lastRoiOn: string | null;
  startAt: Date;
  now?: Date;
  maxDays?: number;
}): { days: number; from: string; to: string } {
  const today = utcDate(input.now ?? new Date());
  const last = input.lastRoiOn ?? utcDate(input.startAt);
  const raw = Math.max(0, daysBetweenUtc(last, today));
  const days = Math.min(raw, input.maxDays ?? 60);
  return {
    days,
    from: addUtcDays(last, 1),
    to: addUtcDays(last, days),
  };
}

export function accruedRoiDays(input: {
  lastRoiOn: string | null;
  startAt: Date;
}): number {
  if (!input.lastRoiOn) return 0;
  return Math.max(0, daysBetweenUtc(utcDate(input.startAt), input.lastRoiOn));
}

/** Next UTC day ROI will credit. `pendingDays` > 0 means credits are already due. */
export function nextRoiDate(input: {
  lastRoiOn: string | null;
  startAt: Date;
  now?: Date;
}): { nextOn: string; pendingDays: number } {
  const due = dueRoiDays(input);
  if (due.days > 0) {
    return { nextOn: due.from, pendingDays: due.days };
  }
  const last = input.lastRoiOn ?? utcDate(input.startAt);
  return { nextOn: addUtcDays(last, 1), pendingDays: 0 };
}

/** Daily extra from reviews. Term ROI is paid at maturity, not here. */
export function planDailyProfit(plan: {
  dailyTaskLimit: number;
  taskReward: number;
}): number {
  return planTaskProfit(plan);
}

export function planTaskProfit(plan: {
  dailyTaskLimit: number;
  taskReward: number;
}): number {
  return plan.dailyTaskLimit * plan.taskReward;
}
