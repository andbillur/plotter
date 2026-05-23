const WIDTH_KG_TABLE = [
  { width: 152, kg: 4.45 },
  { width: 162, kg: 4.78 },
  { width: 182, kg: 5.37 },
  { width: 202, kg: 5.72 },
] as const;

export function expectedNetWeightKg(widthCm: number): number | null {
  const w = Number(widthCm);
  if (!Number.isFinite(w) || w <= 0) return null;

  const pts = WIDTH_KG_TABLE;
  if (w <= pts[0].width) return pts[0].kg;
  if (w >= pts[pts.length - 1].width) return pts[pts.length - 1].kg;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (w >= a.width && w <= b.width) {
      const t = (w - a.width) / (b.width - a.width);
      return Math.round((a.kg + t * (b.kg - a.kg)) * 1000) / 1000;
    }
  }
  return pts[0].kg;
}

export const STANDARD_WIDTH_KG = WIDTH_KG_TABLE;
