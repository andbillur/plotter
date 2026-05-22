/** 202 sm → 200 sm (10 sm qadam) */
export function billingWidthCm(actualWidthCm: number): number {
  if (!Number.isFinite(actualWidthCm) || actualWidthCm <= 0) return 0;
  return Math.floor(actualWidthCm / 10) * 10;
}

export function calcPackagingCost(widthCm: number, pricePerMeter = 6000) {
  const billed = billingWidthCm(widthCm);
  const meters = billed / 100;
  const cost = Math.round(meters * pricePerMeter * 100) / 100;
  return { billingWidthCm: billed, actualWidthCm: widthCm, meters, pricePerMeter, cost };
}
