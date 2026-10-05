function parseRate(value: string | number | undefined): number {
  const n = Number(String(value ?? "").replace(/%/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function planFunding(input: {
  slotPrice: string | number;
  totalSlots: number;
  soldSlots: number;
  returnRate?: string | number;
}) {
  const price = Number(input.slotPrice) || 0;
  const expected = price * input.totalSlots;
  const invested = price * input.soldSlots;
  const remaining = Math.max(0, expected - invested);
  const pct = expected > 0 ? Math.min(100, (invested / expected) * 100) : 0;
  const rate = parseRate(input.returnRate);
  const roiPerSlot = roundMoney((price * rate) / 100);
  const expectedRoi = roundMoney((expected * rate) / 100);
  const investedRoi = roundMoney((invested * rate) / 100);
  return {
    expected,
    invested,
    remaining,
    pct,
    rate,
    roiPerSlot,
    expectedRoi,
    investedRoi,
  };
}
