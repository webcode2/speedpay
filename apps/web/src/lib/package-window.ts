/** Package availability window (shared by marketplace, purchase, reinvest). */
export function isPackageWithinWindow(
  pkg: { availableFrom: Date | null; availableUntil: Date | null },
  now: Date = new Date(),
): boolean {
  if (pkg.availableFrom && pkg.availableFrom > now) return false;
  if (pkg.availableUntil && pkg.availableUntil < now) return false;
  return true;
}
