import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';

export async function dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [prod, plots, clay, bobinStock] = await Promise.all([
    db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'boshlangan')::int AS active,
              COUNT(*) FILTER (WHERE status = 'tugallangan' AND started_at::date = $1::date)::int AS finished_today
       FROM production_sessions`,
      [today]
    ),
    db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'ochiq')::int AS open_plots,
              COUNT(*) FILTER (WHERE closed_at::date = $1::date)::int AS closed_today
       FROM plots`,
      [today]
    ),
    db.query(`SELECT current_stock_kg FROM clay_inventory LIMIT 1`),
    db.query(`SELECT * FROM v_bobin_stock`),
  ]);
  return {
    production: prod.rows[0],
    plots: plots.rows[0],
    clayBalanceKg: clay.rows[0]?.current_stock_kg,
    bobinStock: bobinStock.rows,
  };
}

export async function productionStats(query) {
  const conditions = ['status = \'tugallangan\''];
  const params = [];
  let i = 1;
  if (query.from) { conditions.push(`started_at >= $${i++}`); params.push(query.from); }
  if (query.to) { conditions.push(`started_at <= $${i++}`); params.push(query.to); }
  if (query.machineId) { conditions.push(`machine_id = $${i++}`); params.push(query.machineId); }
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS session_count,
            SUM(bobin_used_kg) AS total_paper_kg,
            SUM(total_clay_used_kg) AS total_clay_kg,
            SUM(output_weight_kg) AS total_output_kg,
            AVG(duration_minutes) AS avg_duration_min
     FROM production_sessions WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows[0];
}

export async function costReport(query) {
  if (query.sessionId) {
    const { rows } = await db.query(
      `SELECT pcr.*, ps.session_code FROM production_cost_reports pcr
       JOIN production_sessions ps ON ps.id = pcr.session_id
       WHERE pcr.session_id = $1`,
      [query.sessionId]
    );
    return rows;
  }
  const conditions = ['1=1'];
  const params = [];
  let i = 1;
  if (query.from) { conditions.push(`pcr.calculated_at >= $${i++}`); params.push(query.from); }
  if (query.to) { conditions.push(`pcr.calculated_at <= $${i++}`); params.push(query.to); }
  const { rows } = await db.query(
    `SELECT pcr.*, ps.session_code FROM production_cost_reports pcr
     JOIN production_sessions ps ON ps.id = pcr.session_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY pcr.calculated_at DESC`,
    params
  );
  return rows;
}

export async function wasteReport(query) {
  const conditions = ['status = \'tugallangan\''];
  const params = [];
  let i = 1;
  if (query.from) { conditions.push(`started_at >= $${i++}`); params.push(query.from); }
  if (query.to) { conditions.push(`started_at <= $${i++}`); params.push(query.to); }
  const { rows } = await db.query(
    `SELECT id, session_code, input_weight_kg, total_output_kg, waste_kg, waste_percent, started_at, finished_at
     FROM cutting_sessions WHERE ${conditions.join(' AND ')}
     ORDER BY started_at DESC`,
    params
  );
  return rows;
}

export async function clayConsumption(query) {
  const { rows } = await db.query(
    `SELECT DATE(created_at) AS day,
            SUM(quantity_kg) FILTER (WHERE operation = 'kirim') AS received_kg,
            SUM(quantity_kg) FILTER (WHERE operation IN ('chiqim', 'qoʻshildi')) AS used_kg
     FROM clay_transactions
     GROUP BY DATE(created_at)
     ORDER BY day DESC
     LIMIT 90`
  );
  return rows;
}

export async function inventory() {
  const clay = await db.query(`SELECT * FROM clay_inventory LIMIT 1`);
  const bobins = await db.query(`SELECT * FROM v_bobin_stock`);
  const bobinList = await db.query(
    `SELECT status, COUNT(*)::int AS cnt FROM bobins GROUP BY status`
  );
  return { clay: clay.rows[0], stockByGrammaj: bobins.rows, byStatus: bobinList.rows };
}

export async function upsertCostConfig(data, userId) {
  const { rows } = await db.query(
    `INSERT INTO cost_config (
      paper_price_per_kg, clay_price_per_kg, electricity_cost_per_kg,
      labor_cost_per_kg, other_cost_per_kg, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      data.paperPricePerKg, data.clayPricePerKg,
      data.electricityCostPerKg || 0, data.laborCostPerKg || 0,
      data.otherCostPerKg || 0, userId,
    ]
  );
  return rows[0];
}

export async function currentCostConfig() {
  const { rows } = await db.query(`SELECT * FROM cost_config ORDER BY valid_from DESC LIMIT 1`);
  return rows[0] || null;
}

export async function listCostConfigHistory(limit = 8) {
  const { rows } = await db.query(
    `SELECT id, paper_price_per_kg, clay_price_per_kg, electricity_cost_per_kg,
            labor_cost_per_kg, other_cost_per_kg, currency, valid_from, created_at
     FROM cost_config ORDER BY valid_from DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function auditLogs(query) {
  const limit = Math.min(100, parseInt(query.limit, 10) || 50);
  const { rows } = await db.query(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}
