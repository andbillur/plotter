import { calcProductionLaborCost, getCurrentCostConfig } from './costCalc.js';

/** Aniq xato — juda katta */
const MAX_LABOR_PER_KG = 10_000;
const MAX_LABOR_SESSION = 500_000;
const MAX_LABOR_PER_METER = 500;

/** Eski xato formuladan qolgan yozuvlar */
export function isInflatedProductionLaborReport(report) {
  if (!report) return false;
  const labor = Number(report.labor_workers_cost) || Number(report.labor_cost_total);
  const perKg = Number(report.labor_cost_per_kg);
  const perM = Number(report.labor_cost_per_meter);
  const outKg = Number(report.output_weight_kg);
  const outM = Number(report.output_meters);
  if (!labor || labor <= 0) {
    if (perKg > MAX_LABOR_PER_KG) return true;
    if (perM > MAX_LABOR_PER_METER) return true;
    return false;
  }
  if (labor > MAX_LABOR_SESSION) return true;
  if (perKg > MAX_LABOR_PER_KG) return true;
  if (perM > MAX_LABOR_PER_METER) return true;
  if (outKg > 0 && labor / outKg > MAX_LABOR_PER_KG) return true;
  if (outM > 0 && perM > 0 && perM * outM > labor * 2 && perM * outM > MAX_LABOR_SESSION) return true;
  return false;
}

/**
 * Saqlangan va qayta hisoblangan farq qattiq bo‘lsa — yangilash kerak.
 */
export function shouldRecalcProductionCostReport(report, repaired) {
  if (!report || !repaired) return false;
  if (isInflatedProductionLaborReport(report)) return true;

  const fields = [
    ['labor_workers_cost', 'labor_workers_cost'],
    ['labor_cost_total', 'labor_cost_total'],
    ['labor_cost_per_kg', 'labor_cost_per_kg'],
    ['labor_cost_per_meter', 'labor_cost_per_meter'],
    ['grand_total_cost', 'grand_total_cost'],
    ['cost_per_kg_output', 'cost_per_kg_output'],
  ];

  for (const [oldKey, newKey] of fields) {
    const oldV = Number(report[oldKey]);
    const newV = Number(repaired[newKey]);
    if (!Number.isFinite(oldV) && !Number.isFinite(newV)) continue;
    if (Math.abs((oldV || 0) - (newV || 0)) > 50) return true;
  }
  return false;
}

/**
 * Tannarx hisobotini to‘g‘ri ish haqi bilan qayta yig‘ish.
 */
export async function repairProductionCostReport(report, sessionId, widthMm, grammageG) {
  const outKg = Number(report.output_weight_kg) || 0;
  if (outKg <= 0) return report;

  const labor = await calcProductionLaborCost(sessionId, outKg, widthMm, grammageG);
  const paper = Number(report.paper_cost_total) || 0;
  const clay = Number(report.clay_cost_total) || 0;
  const elec = Number(report.electricity_cost_total) || 0;
  const other = Number(report.other_cost_total) || 0;

  let laborFinal = labor.total;
  let laborPerKg = labor.laborPerKg;
  let laborPerMeter = labor.laborPerMeter;
  let laborWorkersCost = labor.total;

  if (labor.total <= 0) {
    const config = await getCurrentCostConfig();
    const flatPerKg = Number(config?.labor_cost_per_kg) || 0;
    laborPerKg = flatPerKg;
    laborFinal = Math.round(flatPerKg * outKg * 100) / 100;
    laborWorkersCost = 0;
    laborPerMeter = 0;
  }

  const grandTotal = paper + clay + elec + laborFinal + other;
  const costPerKg = outKg > 0 ? Math.round((grandTotal / outKg) * 100) / 100 : 0;

  return {
    ...report,
    labor_cost_total: laborFinal,
    labor_workers_cost: laborWorkersCost,
    labor_cost_per_kg: laborPerKg,
    labor_cost_per_meter: laborPerMeter,
    grand_total_cost: grandTotal,
    cost_per_kg_output: costPerKg,
  };
}
