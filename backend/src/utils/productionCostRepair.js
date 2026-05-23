import { calcProductionLaborCost, getCurrentCostConfig } from './costCalc.js';

/** Eski xato hisob (oylik × metr va h.k.) — bundan yuqori bo‘lsa qayta hisoblanadi */
const MAX_LABOR_PER_KG = 50_000;
const MAX_LABOR_SESSION = 5_000_000;

export function isInflatedProductionLaborReport(report) {
  if (!report) return false;
  const labor = Number(report.labor_workers_cost);
  const perKg = Number(report.labor_cost_per_kg);
  const perM = Number(report.labor_cost_per_meter);
  const outKg = Number(report.output_weight_kg);
  if (!labor || labor <= 0) return false;
  if (labor > MAX_LABOR_SESSION) return true;
  if (perKg > MAX_LABOR_PER_KG) return true;
  if (perM > 5000) return true;
  if (outKg > 0 && labor / outKg > MAX_LABOR_PER_KG) return true;
  return false;
}

/**
 * Tannarx hisobotini to‘g‘ri ish haqi bilan qayta yig‘ish (faqat ko‘rsatish yoki DB yangilash).
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
