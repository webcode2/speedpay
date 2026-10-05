export type ChartPeriod = "week" | "month" | "quarter" | "year";

export type DailyPoint = {
  date: string;
  amount: number;
};

export const PERIOD_DAYS: Record<ChartPeriod, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

export function addUtcDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fillDailySeries(
  points: DailyPoint[],
  from: string,
  to: string,
): DailyPoint[] {
  const totals = new Map<string, number>();
  for (const point of points) {
    totals.set(point.date, (totals.get(point.date) ?? 0) + Number(point.amount || 0));
  }
  const out: DailyPoint[] = [];
  for (let date = from; date <= to; date = addUtcDays(date, 1)) {
    out.push({ date, amount: totals.get(date) ?? 0 });
  }
  return out;
}

export function seriesForPeriod(
  points: DailyPoint[],
  period: ChartPeriod,
  today: string,
): DailyPoint[] {
  const days = PERIOD_DAYS[period];
  const from = addUtcDays(today, -(days - 1));
  return fillDailySeries(points, from, today);
}

export function formatCompactAmount(value: number): string {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
