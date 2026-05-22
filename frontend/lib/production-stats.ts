/** Ishlab chiqarish sessiyasi — kley va qog'oz ko'rsatkichlari */

export function fmtKg(n: unknown, digits = 1) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toLocaleString('uz-UZ', { maximumFractionDigits: digits })} kg`;
}

export function fmtRatio(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('uz-UZ', { maximumFractionDigits: 4 });
}

export function sessionClaySummary(s: Record<string, unknown>) {
  const clay = Number(s.total_clay_used_kg) || 0;
  const output = Number(s.output_weight_kg) || 0;
  const paperUsed = Number(s.bobin_used_kg) || 0;
  const start = Number(s.bobin_weight_at_start_kg) || 0;
  const clayPerOutput = s.clay_per_kg_output ?? (output > 0 ? clay / output : null);
  const clayPerPaper = s.clay_per_kg_paper ?? (paperUsed > 0 ? clay / paperUsed : null);

  return {
    clay,
    output,
    paperUsed,
    start,
    clayPerOutput,
    clayPerPaper,
  };
}
