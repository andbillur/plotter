import { db } from '../config/database.js';

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

/**
 * Ishlab chiqarish — parallel ishchilar, m/min:
 * vaqt (min) = chiqish_metri / Σ(m/min)
 * ishchi xarajati = (oylik / oy_daqiqa) × vaqt
 * 1 m uchun = jami_ish_haqi / chiqish_metri
 */
export async function calcProductionLaborCost(sessionId, outputMeters) {
  const config = await getCurrentCostConfig();
  const minutesPerMonth = Number(config?.work_minutes_per_month) || 12480;
  const meters = Number(outputMeters) || 0;
  if (meters <= 0) {
    return { total: 0, minutes: 0, outputMeters: 0, laborPerMeter: 0, workers: [] };
  }

  const { rows } = await db.query(
    `SELECT w.id, w.full_name, w.monthly_salary,
            COALESCE(sw.meters_per_minute, sw.kg_per_minute) AS meters_per_minute
     FROM production_session_workers sw
     JOIN cost_workers w ON w.id = sw.worker_id
     WHERE sw.session_id = $1 AND w.is_active = true`,
    [sessionId]
  );
  if (!rows.length) {
    return { total: 0, minutes: 0, outputMeters: meters, laborPerMeter: 0, workers: [] };
  }

  const totalMPerMin = rows.reduce((s, r) => s + Number(r.meters_per_minute), 0);
  if (totalMPerMin <= 0) {
    return { total: 0, minutes: 0, outputMeters: meters, laborPerMeter: 0, workers: [] };
  }

  const minutes = meters / totalMPerMin;
  const workers = rows.map((r) => {
    const salary = Number(r.monthly_salary);
    const minuteRate = salary / minutesPerMonth;
    const cost = Math.round(minuteRate * minutes * 100) / 100;
    return {
      workerId: r.id,
      fullName: r.full_name,
      metersPerMinute: Number(r.meters_per_minute),
      minuteRate: Math.round(minuteRate * 100) / 100,
      cost,
    };
  });
  const total = Math.round(workers.reduce((s, w) => s + w.cost, 0) * 100) / 100;
  const laborPerMeter = Math.round((total / meters) * 10000) / 10000;

  return {
    total,
    minutes: Math.round(minutes * 10) / 10,
    outputMeters: meters,
    laborPerMeter,
    workers,
  };
}

/**
 * Kesish — parallel ishchilar, kg/min (o'zgarishsiz)
 */
export async function calcSessionLaborCost(sessionId, outputKg, table) {
  const config = await getCurrentCostConfig();
  const minutesPerMonth = Number(config?.work_minutes_per_month) || 12480;
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

  const minutes = out / totalKgPerMin;
  const workers = rows.map((r) => {
    const salary = Number(r.monthly_salary);
    const cost = Math.round((salary / minutesPerMonth) * minutes * 100) / 100;
    return {
      workerId: r.id,
      fullName: r.full_name,
      kgPerMinute: Number(r.kg_per_minute),
      cost,
    };
  });
  const total = workers.reduce((s, w) => s + w.cost, 0);
  return { total: Math.round(total * 100) / 100, minutes: Math.round(minutes * 10) / 10, workers };
}
