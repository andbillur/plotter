import { db } from '../config/database.js';

/** Oylikni daqiqaga: odatda 30 × 24 × 60 */
export const CALENDAR_MINUTES_PER_MONTH = 30 * 24 * 60;

/** 202 sm → 200 sm (10 sm qadam) */
export function billingWidthCm(actualWidthCm) {
  const w = Number(actualWidthCm);
  if (!Number.isFinite(w) || w <= 0) return 0;
  return Math.floor(w / 10) * 10;
}

export async function getCurrentCostConfig() {
  const { rows } = await db.query(
    `SELECT * FROM cost_config ORDER BY valid_from DESC LIMIT 1`
  );
  return rows[0] || null;
}

/** Sozlamadan: oylik / oy_daqiqalari (standart 43200) */
export function getSalaryMinutesPerMonth(config) {
  const fromConfig = Number(config?.work_minutes_per_month);
  if (Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
  return CALENDAR_MINUTES_PER_MONTH;
}

/** Salafan/karton: eni (m) × narx (so'm/m) */
export function calcPackagingCost(widthCm, config) {
  const billed = billingWidthCm(widthCm);
  const meters = billed / 100;
  const price = Number(config?.packaging_price_per_meter ?? 6000);
  return {
    billingWidthCm: billed,
    actualWidthCm: Number(widthCm),
    meters,
    pricePerMeter: price,
    cost: Math.round(meters * price * 100) / 100,
  };
}

/**
 * Chiqish metri: kg = eni(m) × uzunlik(m) × grammaj(g/m²) / 1000
 * uzunlik(m) = kg × 1000 / (eni_m × grammaj)
 */
export function calcOutputMetersFromKg(outputKg, widthMm, grammageG) {
  const kg = Number(outputKg);
  const widthM = Number(widthMm) / 1000;
  const g = Number(grammageG);
  if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(widthM) || widthM <= 0 || !Number.isFinite(g) || g <= 0) {
    return null;
  }
  return Math.round(((kg * 1000) / (widthM * g)) * 100) / 100;
}

/** 1 metr massasi (kg): eni(m) × grammaj / 1000 */
export function calcKgPerMeter(widthMm, grammageG) {
  const widthM = Number(widthMm) / 1000;
  const g = Number(grammageG);
  if (!Number.isFinite(widthM) || widthM <= 0 || !Number.isFinite(g) || g <= 0) return 0;
  return (widthM * g) / 1000;
}

/**
 * Ishlab chiqarish tezligi: Σ(m/min) → kg/min
 * kg/min = m/min × eni(m) × grammaj / 1000
 */
export function calcKgPerMinFromMetersPerMin(totalMetersPerMin, widthMm, grammageG) {
  const mpm = Number(totalMetersPerMin);
  const kgPerM = calcKgPerMeter(widthMm, grammageG);
  if (mpm <= 0 || kgPerM <= 0) return 0;
  return Math.round(mpm * kgPerM * 10000) / 10000;
}

/** 1 kg uchun vaqt (daqiqa) = 1 / kg/min */
export function calcMinutesPerKg(kgPerMin) {
  const k = Number(kgPerMin);
  if (!k || k <= 0) return 0;
  return Math.round((1 / k) * 10000) / 10000;
}

/** Jamoa daqiqalik stavkasi = Σ(oylik) / oy_daqiqalari */
export function calcTeamMinuteRate(totalMonthlySalary, minutesPerMonth) {
  const salary = Number(totalMonthlySalary);
  const mins = Number(minutesPerMonth);
  if (salary <= 0 || !mins || mins <= 0) return 0;
  return Math.round((salary / mins) * 100) / 100;
}

/**
 * Ishlab chiqarish ish haqi (tannarx):
 * 1) Σ oylik → daqiqalik stavka (oylik / 30×24×60 yoki sozlamadagi minut)
 * 2) Σ m/min + bobin eni/grammaj → kg/min
 * 3) 1 kg vaqti = 1 / kg/min
 * 4) 1 kg ish haqi = daqiqalik_stavka × 1_kg_vaqti
 * 5) Sessiya = 1_kg_ish_haqi × chiqish_kg
 */
export async function calcProductionLaborCost(sessionId, outputKg, widthMm, grammageG) {
  const config = await getCurrentCostConfig();
  const minutesPerMonth = getSalaryMinutesPerMonth(config);
  const outKg = Number(outputKg) || 0;

  const empty = {
    total: 0,
    minutes: 0,
    outputKg: outKg,
    laborPerKg: 0,
    laborPerMeter: 0,
    minutesPerKg: 0,
    secondsPerKg: 0,
    kgPerMin: 0,
    teamMinuteRate: 0,
    totalSalary: 0,
    totalMPerMin: 0,
    workers: [],
  };

  if (outKg <= 0) return empty;

  const { rows } = await db.query(
    `SELECT w.id, w.full_name, w.monthly_salary,
            COALESCE(sw.meters_per_minute, sw.kg_per_minute) AS meters_per_minute
     FROM production_session_workers sw
     JOIN cost_workers w ON w.id = sw.worker_id
     WHERE sw.session_id = $1 AND w.is_active = true`,
    [sessionId]
  );
  if (!rows.length) return empty;

  const totalMPerMin = rows.reduce((s, r) => s + Number(r.meters_per_minute), 0);
  if (totalMPerMin <= 0) return empty;

  const totalSalary = rows.reduce((s, r) => s + Number(r.monthly_salary), 0);
  const kgPerMin = calcKgPerMinFromMetersPerMin(totalMPerMin, widthMm, grammageG);
  if (kgPerMin <= 0) return empty;

  const minutesPerKg = calcMinutesPerKg(kgPerMin);
  const teamMinuteRate = calcTeamMinuteRate(totalSalary, minutesPerMonth);
  const laborPerKg = Math.round(teamMinuteRate * minutesPerKg * 100) / 100;
  const total = Math.round(laborPerKg * outKg * 100) / 100;
  const sessionMinutes = Math.round(minutesPerKg * outKg * 10) / 10;

  const kgPerM = calcKgPerMeter(widthMm, grammageG);
  const laborPerMeter = kgPerM > 0 ? Math.round(laborPerKg * kgPerM * 10000) / 10000 : 0;

  const workers = rows.map((r) => {
    const salary = Number(r.monthly_salary);
    const share = totalSalary > 0 ? salary / totalSalary : 0;
    const cost = Math.round(total * share * 100) / 100;
    return {
      workerId: r.id,
      fullName: r.full_name,
      metersPerMinute: Number(r.meters_per_minute),
      salaryShare: Math.round(share * 10000) / 10000,
      cost,
    };
  });

  return {
    total,
    minutes: sessionMinutes,
    outputKg: outKg,
    laborPerKg,
    laborPerMeter,
    minutesPerKg,
    secondsPerKg: Math.round(minutesPerKg * 60 * 10) / 10,
    kgPerMin,
    teamMinuteRate,
    totalSalary,
    totalMPerMin,
    workers,
  };
}

/**
 * Kesish — parallel ishchilar, kg/min
 */
export async function calcSessionLaborCost(sessionId, outputKg, table) {
  const config = await getCurrentCostConfig();
  const minutesPerMonth = getSalaryMinutesPerMonth(config);
  const out = Number(outputKg) || 0;
  if (out <= 0) return { total: 0, minutes: 0, workers: [] };

  const { rows } = await db.query(
    `SELECT w.id, w.full_name, w.monthly_salary, sw.kg_per_minute
     FROM ${table} sw
     JOIN cost_workers w ON w.id = sw.worker_id
     WHERE sw.session_id = $1 AND w.is_active = true`,
    [sessionId]
  );
  if (!rows.length) return { total: 0, minutes: 0, workers: [] };

  const totalKgPerMin = rows.reduce((s, r) => s + Number(r.kg_per_minute), 0);
  if (totalKgPerMin <= 0) return { total: 0, minutes: 0, workers: [] };

  const totalSalary = rows.reduce((s, r) => s + Number(r.monthly_salary), 0);
  const teamMinuteRate = calcTeamMinuteRate(totalSalary, minutesPerMonth);
  const minutesPerKg = calcMinutesPerKg(totalKgPerMin);
  const laborPerKg = Math.round(teamMinuteRate * minutesPerKg * 100) / 100;
  const total = Math.round(laborPerKg * out * 100) / 100;
  const minutes = Math.round(minutesPerKg * out * 10) / 10;

  const workers = rows.map((r) => {
    const salary = Number(r.monthly_salary);
    const share = totalSalary > 0 ? salary / totalSalary : 0;
    return {
      workerId: r.id,
      fullName: r.full_name,
      kgPerMinute: Number(r.kg_per_minute),
      cost: Math.round(total * share * 100) / 100,
    };
  });

  return { total, minutes, laborPerKg, workers };
}
