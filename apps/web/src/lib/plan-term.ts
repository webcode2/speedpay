export type DurationUnit = "days" | "weeks" | "months";

const MS_PER_DAY = 86_400_000;

export function toDurationDays(value: number, unit: DurationUnit): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Duration must be a whole number of 1 or more.");
  }
  if (unit === "weeks") return value * 7;
  if (unit === "months") return value * 30;
  return value;
}

export function fromDurationDays(days: number): {
  value: number;
  unit: DurationUnit;
} {
  if (days >= 30 && days % 30 === 0) {
    return { value: days / 30, unit: "months" };
  }
  if (days >= 7 && days % 7 === 0) {
    return { value: days / 7, unit: "weeks" };
  }
  return { value: Math.max(1, days), unit: "days" };
}

export function formatDuration(days: number): string {
  const { value, unit } = fromDurationDays(days);
  if (unit === "months") return value === 1 ? "1 month" : `${value} months`;
  if (unit === "weeks") return value === 1 ? "1 week" : `${value} weeks`;
  return value === 1 ? "1 day" : `${value} days`;
}

export function addDurationDays(start: Date, days: number): Date {
  return new Date(start.getTime() + Math.max(1, days) * MS_PER_DAY);
}
