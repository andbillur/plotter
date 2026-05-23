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
      labor_cost_per_kg, other_cost_per_kg,
      packaging_price_per_meter, work_minutes_per_month, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      data.paperPricePerKg, data.clayPricePerKg,
      data.electricityCostPerKg || 0, data.laborCostPerKg || 0,
      data.otherCostPerKg || 0,
      data.packagingPricePerMeter ?? 6000,
      data.workMinutesPerMonth ?? 12480,
      userId,
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
            labor_cost_per_kg, other_cost_per_kg, packaging_price_per_meter,
            work_minutes_per_month, currency, valid_from, created_at
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

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** CRM dashboard + Power BI uchun boyitilgan ma'lumot */
export async function biDashboard(query = {}) {
  const days = Math.min(365, Math.max(7, parseInt(query.days, 10) || 90));
  const since = daysAgo(days);
  const today = new Date().toISOString().slice(0, 10);

  const [
    productionDaily,
    costBreakdown,
    costPerKgTrend,
    wasteDaily,
    warehouseStock,
    packagingDaily,
    clayTrend,
    productionKpis,
    cuttingKpis,
    recentCosts,
    topWaste,
  ] = await Promise.all([
    db.query(
      `SELECT * FROM v_bi_production_daily WHERE day >= $1::date ORDER BY day`,
      [since.slice(0, 10)]
    ),
    db.query(
      `SELECT
        COALESCE(SUM(paper_cost_total),0)::float AS paper,
        COALESCE(SUM(clay_cost_total),0)::float AS clay,
        COALESCE(SUM(electricity_cost_total),0)::float AS electricity,
        COALESCE(SUM(labor_cost_total),0)::float AS labor,
        COALESCE(SUM(labor_workers_cost),0)::float AS labor_workers,
        COALESCE(SUM(other_cost_total),0)::float AS other,
        COALESCE(SUM(grand_total_cost),0)::float AS grand_total
       FROM v_bi_cost_reports WHERE finished_at >= $1`,
      [since]
    ),
    db.query(
      `SELECT DATE(finished_at) AS day,
              AVG(cost_per_kg_output)::float AS avg_cost_per_kg,
              SUM(grand_total_cost)::float AS total_cost
       FROM v_bi_cost_reports WHERE finished_at >= $1
       GROUP BY DATE(finished_at) ORDER BY day`,
      [since]
    ),
    db.query(
      `SELECT day, session_count, output_kg, avg_waste_pct, labor_cost, packaging_cost
       FROM (
         SELECT DATE(finished_at) AS day,
                COUNT(*)::int AS session_count,
                COALESCE(SUM(total_output_kg),0)::float AS output_kg,
                COALESCE(AVG(waste_percent),0)::float AS avg_waste_pct,
                COALESCE(SUM(total_labor_cost),0)::float AS labor_cost,
                COALESCE(SUM(total_packaging_cost),0)::float AS packaging_cost
         FROM cutting_sessions
         WHERE status = 'tugallangan' AND finished_at >= $1
         GROUP BY DATE(finished_at)
       ) t ORDER BY day`,
      [since]
    ),
    db.query(`SELECT * FROM v_bi_warehouse_stock ORDER BY width_cm`),
    db.query(
      `SELECT * FROM v_bi_packaging_daily WHERE day >= $1::date ORDER BY day`,
      [since.slice(0, 10)]
    ),
    clayConsumption(query),
    db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'boshlangan')::int AS active,
              COUNT(*) FILTER (WHERE status = 'tugallangan' AND finished_at::date = $1::date)::int AS finished_today,
              COALESCE(SUM(output_weight_kg) FILTER (WHERE status = 'tugallangan' AND finished_at >= $2),0)::float AS output_kg_period
       FROM production_sessions`,
      [today, since]
    ),
    db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'boshlangan')::int AS active,
              COALESCE(AVG(waste_percent) FILTER (WHERE status = 'tugallangan' AND finished_at >= $1),0)::float AS avg_waste_pct,
              COALESCE(SUM(total_packaging_cost) FILTER (WHERE status = 'tugallangan' AND finished_at >= $1),0)::float AS packaging_cost_period
       FROM cutting_sessions`,
      [since]
    ),
    db.query(
      `SELECT session_code, cost_per_kg_output, grand_total_cost, finished_at
       FROM v_bi_cost_reports ORDER BY finished_at DESC NULLS LAST LIMIT 15`
    ),
    db.query(
      `SELECT session_code, waste_percent, waste_kg, finished_at
       FROM v_bi_cutting_waste ORDER BY waste_percent DESC NULLS LAST LIMIT 10`
    ),
  ]);

  const cb = costBreakdown.rows[0] || {};
  return {
    periodDays: days,
    productionDaily: productionDaily.rows,
    costBreakdown: {
      paper: Number(cb.paper) || 0,
      clay: Number(cb.clay) || 0,
      electricity: Number(cb.electricity) || 0,
      labor: Number(cb.labor) || 0,
      labor_workers: Number(cb.labor_workers) || 0,
      other: Number(cb.other) || 0,
      grand_total: Number(cb.grand_total) || 0,
    },
    costPerKgTrend: costPerKgTrend.rows,
    wasteDaily: wasteDaily.rows,
    warehouseStock: warehouseStock.rows,
    packagingDaily: packagingDaily.rows,
    clayTrend: clayTrend.slice(0, 60).reverse(),
    kpis: {
      production: productionKpis.rows[0],
      cutting: cuttingKpis.rows[0],
    },
    recentCosts: recentCosts.rows,
    topWaste: topWaste.rows,
    powerBiViews: [
      'v_bi_production_daily',
      'v_bi_cost_reports',
      'v_bi_cutting_waste',
      'v_bi_warehouse_stock',
      'v_bi_packaging_daily',
    ],
  };
}

const PRIVATE_POWERBI_MESSAGE =
  'Ochiq Power BI (Publish to web) o\'chirilgan. Tannarx va ishlab chiqarish sirlari faqat CRM login orqali ko\'rinadi.';

export async function getPowerBiConfig() {
  const { rows } = await db.query(
    `SELECT key, value FROM app_settings
     WHERE key IN ('powerbi_embed_url', 'powerbi_embed_title', 'powerbi_mode')`
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value || '']));
  const publicAllowed = process.env.ALLOW_POWERBI_PUBLIC_EMBED === 'true';
  return {
    mode: publicAllowed && map.powerbi_embed_url ? 'public' : map.powerbi_mode || 'private',
    publicEmbedAllowed: publicAllowed,
    embedUrl: publicAllowed ? map.powerbi_embed_url || '' : '',
    title: map.powerbi_embed_title || 'Plotter CRM — Power BI',
    message: publicAllowed ? '' : PRIVATE_POWERBI_MESSAGE,
  };
}

export async function setPowerBiConfig({ embedUrl, title }, userId) {
  const publicAllowed = process.env.ALLOW_POWERBI_PUBLIC_EMBED === 'true';
  if (embedUrl && String(embedUrl).trim()) {
    if (!publicAllowed) {
      throw new AppError(PRIVATE_POWERBI_MESSAGE, 403);
    }
    await db.query(
      `INSERT INTO app_settings (key, value, updated_by) VALUES ('powerbi_embed_url', $1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW(), updated_by = $2`,
      [embedUrl.trim(), userId]
    );
    await db.query(
      `INSERT INTO app_settings (key, value, updated_by) VALUES ('powerbi_mode', 'public', $1)
       ON CONFLICT (key) DO UPDATE SET value = 'public', updated_at = NOW(), updated_by = $1`,
      [userId]
    );
  } else {
    await db.query(
      `INSERT INTO app_settings (key, value, updated_by) VALUES ('powerbi_embed_url', '', $1)
       ON CONFLICT (key) DO UPDATE SET value = '', updated_at = NOW(), updated_by = $1`,
      [userId]
    );
    await db.query(
      `INSERT INTO app_settings (key, value, updated_by) VALUES ('powerbi_mode', 'private', $1)
       ON CONFLICT (key) DO UPDATE SET value = 'private', updated_at = NOW(), updated_by = $1`,
      [userId]
    );
  }
  if (title != null) {
    await db.query(
      `INSERT INTO app_settings (key, value, updated_by) VALUES ('powerbi_embed_title', $1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW(), updated_by = $2`,
      [title, userId]
    );
  }
  return getPowerBiConfig();
}

/** Eski ochiq embed havolasini tozalash */
export async function clearPublicPowerBiEmbed(userId) {
  await db.query(
    `INSERT INTO app_settings (key, value, updated_by) VALUES ('powerbi_embed_url', '', $1)
     ON CONFLICT (key) DO UPDATE SET value = '', updated_at = NOW(), updated_by = $1`,
    [userId]
  );
  return getPowerBiConfig();
}

/** Power BI Desktop ulanish (parolsiz) */
export function powerBiConnectionHint() {
  const url = process.env.DATABASE_URL || '';
  let host = '';
  let database = 'plotter_crm';
  let port = 5432;
  try {
    const u = new URL(url.replace(/^postgres:/, 'postgresql:'));
    host = u.hostname;
    port = Number(u.port) || 5432;
    database = (u.pathname || '/plotter_crm').replace(/^\//, '') || database;
  } catch {
    host = '(DATABASE_URL sozlang)';
  }
  return {
    host,
    port,
    database,
    sslMode: 'require',
    views: [
      'v_bi_production_daily',
      'v_bi_cost_reports',
      'v_bi_cutting_waste',
      'v_bi_warehouse_stock',
      'v_bi_packaging_daily',
    ],
    desktopFree: true,
    note: 'Power BI Desktop faqat kompyuteringizda — ma\'lumot internetga publish qilinmaydi. CRM grafiklar login bilan himoyalangan.',
    privacy: 'private',
    publishToWebAllowed: false,
  };
}
