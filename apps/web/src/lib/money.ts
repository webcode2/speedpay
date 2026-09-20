/** Display wallet/ledger amounts (integer minor units or decimal majors as stored). */
export function formatAmount(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  const formatted = Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : String(value ?? "—");
  return currency ? `${formatted} ${currency}` : formatted;
}
