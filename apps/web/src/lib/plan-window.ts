/** Plan availability window (shared by marketplace, purchase, reinvest). */
export function isPlanWithinWindow(
  plan: { availableFrom: Date | null; availableUntil: Date | null },
  now: Date = new Date(),
): boolean {
  if (plan.availableFrom && plan.availableFrom > now) return false;
  if (plan.availableUntil && plan.availableUntil < now) return false;
  return true;
}
