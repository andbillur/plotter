import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { calcProductionLaborCost, calcOutputMetersFromKg, calcOutputKgFromMeters } from '../../utils/costCalc.js';
import {
  shouldRecalcProductionCostReport,
  repairProductionCostReport,
} from '../../utils/productionCostRepair.js';
import {
  bobinCanStartProduction,
  bobinStatusAfterFinish,
} from '../../utils/bobinStock.js';
import * as costWorkers from '../costWorkers/costWorkers.service.js';

export async function start({ bobinQrCode, machineId }, operatorId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const bobin = await client.query(
      `SELECT * FROM bobins WHERE qr_code = $1 FOR UPDATE`,
      [bobinQrCode]
    );
    if (!bobin.rows.length) throw new AppError('Bobin topilmadi', 404);
    const b = bobin.rows[0];
    if (!bobinCanStartProduction(b)) {
      if (b.status === 'mashinada') {
        throw new AppError('Bobin boshqa mashinada', 400);
      }
      if (b.status === 'ishlatilgan') {
        throw new AppError('Bobin to\'liq ishlatilgan (qoldiq yo\'q)', 400);
      }
      throw new AppError('Bobin ishlab chiqarish uchun tayyor emas', 400);
    }

    const active = await client.query(
      `SELECT id FROM production_sessions WHERE bobin_id = $1 AND status = 'boshlangan'`,
      [b.id]
    );
    if (active.rows.length) throw new AppError('Bu bobin uchun sessiya allaqachon ochiq', 400);

    const codeRes = await client.query(`SELECT generate_session_code() AS code`);
    const sessionCode = codeRes.rows[0].code;

    const { rows } = await client.query(
      `INSERT INTO production_sessions (
        session_code, bobin_id, machine_id, operator_id,
        bobin_weight_at_start_kg, status
      ) VALUES ($1,$2,$3,$4,$5,'boshlangan') RETURNING *`,
      [sessionCode, b.id, machineId, operatorId, b.current_weight_kg]
    );

    await client.query(
      `UPDATE bobins SET status = 'mashinada', current_machine_id = $1, updated_at = NOW() WHERE id = $2`,
      [machineId, b.id]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function addClay(sessionId, { quantityKg, bags }, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const sess = await client.query(
      `SELECT * FROM production_sessions WHERE id = $1 AND status = 'boshlangan' FOR UPDATE`,
      [sessionId]
    );
    if (!sess.rows.length) throw new AppError('Sessiya topilmadi yoki yopilgan', 404);
    const s = sess.rows[0];

    const inv = await client.query(`SELECT current_stock_kg FROM clay_inventory LIMIT 1 FOR UPDATE`);
    const stock = parseFloat(inv.rows[0]?.current_stock_kg || 0);
    const invRow = await client.query(`SELECT bag_weight_kg FROM clay_inventory LIMIT 1`);
    const qty = quantityKg ?? (bags * parseFloat(invRow.rows[0]?.bag_weight_kg || 20));
    if (stock < qty) throw new AppError('Kley zaxirasi yetarli emas', 400);

    const newTotal = parseFloat(s.total_clay_used_kg) + qty;
    await client.query(
      `UPDATE production_sessions SET total_clay_used_kg = $1 WHERE id = $2`,
      [newTotal, sessionId]
    );

    await client.query(
      `INSERT INTO clay_transactions (operation, quantity_bags, quantity_kg, balance_after_kg, production_session_id, performed_by)
       VALUES ('qoʻshildi', $1, $2, 0, $3, $4)`,
      [bags || null, qty, sessionId, userId]
    );

    await client.query(
      `INSERT INTO session_clay_additions (session_id, quantity_kg, cumulative_kg, added_by)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, qty, newTotal, userId]
    );

    await client.query('COMMIT');
    return { sessionId, addedKg: qty, totalClayUsedKg: newTotal };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function finish(sessionId, { outputMeters, bobinRemainingMeters }, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const sess = await client.query(
      `SELECT * FROM production_sessions WHERE id = $1 AND status = 'boshlangan' FOR UPDATE`,
      [sessionId]
    );
    if (!sess.rows.length) throw new AppError('Sessiya topilmadi', 404);
    const s = sess.rows[0];

    const bobinMeta = await client.query(
      `SELECT width_mm, grammaj, current_length_m FROM bobins WHERE id = $1`,
      [s.bobin_id]
    );
    const bMeta = bobinMeta.rows[0] || {};

    const outMeters = Number(outputMeters);
    const remainingM = Number(bobinRemainingMeters);
    if (!Number.isFinite(outMeters) || outMeters <= 0) {
      throw new AppError('Tayyor mahsulot uzunligini metrda kiriting', 400);
    }
    if (!Number.isFinite(remainingM) || remainingM < 0) {
      throw new AppError('Qolgan bobin uzunligini metrda kiriting', 400);
    }

    const outputWeightKg = calcOutputKgFromMeters(outMeters, bMeta.width_mm, bMeta.grammaj);
    if (outputWeightKg == null || outputWeightKg <= 0) {
      throw new AppError('Kg hisoblanmadi: bobinda eni (mm) va grammaj to\'g\'ri kiriting', 400);
    }

    let remainingKg = calcOutputKgFromMeters(remainingM, bMeta.width_mm, bMeta.grammaj);
    if (remainingKg == null) remainingKg = 0;

    await client.query(
      `UPDATE production_sessions SET
        bobin_weight_at_finish_kg = $1,
        output_weight_kg = $2,
        status = 'tugallangan',
        finished_at = NOW()
       WHERE id = $3`,
      [remainingKg, outputWeightKg, sessionId]
    );

    const nextStatus = bobinStatusAfterFinish(remainingKg, remainingM);
    await client.query(
      `UPDATE bobins SET
        current_weight_kg = $1,
        current_length_m = $2,
        status = $3,
        current_machine_id = NULL,
        updated_at = NOW()
       WHERE id = $4`,
      [remainingKg, remainingM, nextStatus, s.bobin_id]
    );

    const cost = await client.query(`SELECT * FROM calculate_production_cost($1)`, [sessionId]);
    const cfg = await client.query(`SELECT id FROM cost_config ORDER BY valid_from DESC LIMIT 1`);
    const c = cost.rows[0];

    const outputMetersStored = outMeters;
    const outKg = Number(c.output_kg) || Number(outputWeightKg);

    const laborWorkers = await calcProductionLaborCost(
      sessionId,
      outKg,
      bMeta.width_mm,
      bMeta.grammaj
    );
    let laborFinal =
      laborWorkers.total > 0 ? laborWorkers.total : Number(c.labor_cost);

    const wc = await client.query(
      `SELECT COUNT(*)::int AS n FROM production_session_workers WHERE session_id = $1`,
      [sessionId]
    );
    if (Number(wc.rows[0]?.n) > 0 && laborWorkers.total <= 0) {
      throw new AppError(
        'Ish haqi hisoblanmadi: bobinda eni (mm) va grammaj to\'g\'ri kiriting (masalan eni 1820, grammaj 40). Ishchilar m/min ni tekshiring.',
        400
      );
    }

    const grandTotal =
      Number(c.paper_cost) +
      Number(c.clay_cost) +
      Number(c.electricity_cost) +
      laborFinal +
      Number(c.other_cost);
    const costPerKg = outKg > 0 ? grandTotal / outKg : 0;

    await client.query(
      `INSERT INTO production_cost_reports (
        session_id, cost_config_id, paper_used_kg, clay_used_kg, output_weight_kg,
        output_meters, clay_per_kg_paper, paper_cost_total, clay_cost_total, electricity_cost_total,
        labor_cost_total, labor_workers_cost, labor_cost_per_kg, labor_cost_per_meter, other_cost_total, grand_total_cost, cost_per_kg_output,
        waste_kg, waste_percent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        sessionId, cfg.rows[0].id,
        c.paper_used_kg, c.clay_used_kg, c.output_kg, outputMetersStored,
        c.clay_ratio,
        c.paper_cost, c.clay_cost, c.electricity_cost, laborFinal, laborWorkers.total,
        laborWorkers.laborPerKg || 0,
        laborWorkers.laborPerMeter || 0,
        c.other_cost, grandTotal, costPerKg, c.waste_kg, c.waste_percent,
      ]
    );

    const updated = await client.query(`SELECT * FROM production_sessions WHERE id = $1`, [sessionId]);
    const report = await client.query(
      `SELECT * FROM production_cost_reports WHERE session_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
      [sessionId]
    );

    await client.query('COMMIT');
    return { session: updated.rows[0], costReport: report.rows[0] };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function cancel(sessionId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const sess = await client.query(
      `SELECT * FROM production_sessions WHERE id = $1 FOR UPDATE`,
      [sessionId]
    );
    if (!sess.rows.length) throw new AppError('Sessiya topilmadi', 404);
    if (sess.rows[0].status !== 'boshlangan') throw new AppError('Faqat ochiq sessiyani bekor qilish mumkin', 400);

    await client.query(
      `UPDATE production_sessions SET status = 'bekor_qilingan', finished_at = NOW() WHERE id = $1`,
      [sessionId]
    );
    await client.query(
      `UPDATE bobins SET status = 'omborxonada', current_machine_id = NULL WHERE id = $1`,
      [sess.rows[0].bobin_id]
    );
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getById(id) {
  const { rows } = await db.query(
    `SELECT ${SESSION_LIST_SELECT}
     FROM production_sessions ps
     JOIN bobins b ON b.id = ps.bobin_id
     LEFT JOIN machines m ON m.id = ps.machine_id
     WHERE ps.id = $1`,
    [id]
  );
  if (!rows.length) throw new AppError('Sessiya topilmadi', 404);
  const clay = await db.query(
    `SELECT * FROM session_clay_additions WHERE session_id = $1 ORDER BY added_at`,
    [id]
  );
  let costReport = null;
  if (rows[0].status === 'tugallangan') {
    const cost = await db.query(
      `SELECT * FROM production_cost_reports WHERE session_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
      [id]
    );
    costReport = cost.rows[0] || null;
    if (costReport) {
      const repaired = await repairProductionCostReport(
        costReport,
        id,
        rows[0].bobin_width_mm,
        rows[0].bobin_grammaj
      );
      if (shouldRecalcProductionCostReport(costReport, repaired)) {
        await db.query(
          `UPDATE production_cost_reports SET
            labor_cost_total = $1, labor_workers_cost = $2, labor_cost_per_kg = $3,
            labor_cost_per_meter = $4, grand_total_cost = $5, cost_per_kg_output = $6
           WHERE id = $7`,
          [
            repaired.labor_cost_total,
            repaired.labor_workers_cost,
            repaired.labor_cost_per_kg,
            repaired.labor_cost_per_meter,
            repaired.grand_total_cost,
            repaired.cost_per_kg_output,
            costReport.id,
          ]
        );
        costReport = repaired;
      }
    }
  }
  const workers = await costWorkers.getProductionWorkers(id);
  return { ...rows[0], clayAdditions: clay.rows, costReport, workers };
}

export async function setSessionWorkers(sessionId, workers) {
  const sess = await db.query(`SELECT id, status FROM production_sessions WHERE id = $1`, [sessionId]);
  if (!sess.rows.length) throw new AppError('Sessiya topilmadi', 404);
  if (sess.rows[0].status !== 'boshlangan') {
    throw new AppError('Faqat ochiq sessiyaga ishchi biriktirish mumkin', 400);
  }
  return costWorkers.setProductionWorkers(sessionId, workers);
}

export async function getCost(id) {
  const { rows } = await db.query(
    `SELECT * FROM production_cost_reports WHERE session_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
    [id]
  );
  if (!rows.length) {
    const calc = await db.query(`SELECT * FROM calculate_production_cost($1)`, [id]);
    return calc.rows[0] || null;
  }
  let report = rows[0];
  const sess = await db.query(
    `SELECT ps.id, b.width_mm, b.grammaj
     FROM production_sessions ps
     JOIN bobins b ON b.id = ps.bobin_id
     WHERE ps.id = $1`,
    [id]
  );
  if (sess.rows.length) {
    const s = sess.rows[0];
    const repaired = await repairProductionCostReport(report, id, s.width_mm, s.grammaj);
    if (shouldRecalcProductionCostReport(report, repaired)) {
      await db.query(
        `UPDATE production_cost_reports SET
          labor_cost_total = $1, labor_workers_cost = $2, labor_cost_per_kg = $3,
          labor_cost_per_meter = $4, grand_total_cost = $5, cost_per_kg_output = $6
         WHERE id = $7`,
        [
          repaired.labor_cost_total,
          repaired.labor_workers_cost,
          repaired.labor_cost_per_kg,
          repaired.labor_cost_per_meter,
          repaired.grand_total_cost,
          repaired.cost_per_kg_output,
          report.id,
        ]
      );
      report = repaired;
    }
  }
  return report;
}

/** Barcha (yoki farqi bor) tannarx hisobotlarini qayta hisoblash */
export async function recalcInflatedCostReports({ forceAll = false } = {}) {
  const { rows } = await db.query(
    `SELECT pcr.*, ps.id AS session_id, ps.session_code, b.width_mm, b.grammaj
     FROM production_cost_reports pcr
     JOIN production_sessions ps ON ps.id = pcr.session_id
     JOIN bobins b ON b.id = ps.bobin_id
     WHERE ps.status = 'tugallangan'`
  );

  let fixed = 0;
  let skipped = 0;

  for (const row of rows) {
    const { rows: wc } = await db.query(
      `SELECT COUNT(*)::int AS n FROM production_session_workers
       WHERE session_id = $1 AND meters_per_minute IS NOT NULL AND meters_per_minute > 0`,
      [row.session_id]
    );
    const hasWorkers = Number(wc[0]?.n) > 0;

    const repaired = await repairProductionCostReport(
      row,
      row.session_id,
      row.width_mm,
      row.grammaj
    );

    const mustUpdate =
      forceAll && hasWorkers ? true : shouldRecalcProductionCostReport(row, repaired);

    if (!mustUpdate) {
      skipped++;
      continue;
    }

    await db.query(
      `UPDATE production_cost_reports SET
        labor_cost_total = $1,
        labor_workers_cost = $2,
        labor_cost_per_kg = $3,
        labor_cost_per_meter = $4,
        grand_total_cost = $5,
        cost_per_kg_output = $6
       WHERE id = $7`,
      [
        repaired.labor_cost_total,
        repaired.labor_workers_cost,
        repaired.labor_cost_per_kg,
        repaired.labor_cost_per_meter,
        repaired.grand_total_cost,
        repaired.cost_per_kg_output,
        row.id,
      ]
    );
    fixed++;
  }
  return { fixed, skipped, total: rows.length, forceAll };
}

const SESSION_LIST_SELECT = `
  ps.*,
  b.qr_code AS bobin_qr,
  b.grammaj AS bobin_grammaj,
  b.width_mm AS bobin_width_mm,
  m.name AS machine_name,
  CASE
    WHEN ps.output_weight_kg > 0 AND ps.total_clay_used_kg > 0
    THEN ROUND(ps.total_clay_used_kg / ps.output_weight_kg, 4)
    ELSE NULL
  END AS clay_per_kg_output,
  CASE
    WHEN ps.bobin_used_kg > 0 AND ps.total_clay_used_kg > 0
    THEN ROUND(ps.total_clay_used_kg / ps.bobin_used_kg, 4)
    ELSE NULL
  END AS clay_per_kg_paper
`;

export async function listActive() {
  const { rows } = await db.query(
    `SELECT ${SESSION_LIST_SELECT},
            b.current_weight_kg AS bobin_current_kg,
            GREATEST(0, ps.bobin_weight_at_start_kg - b.current_weight_kg) AS bobin_consumed_so_far_kg
     FROM production_sessions ps
     JOIN bobins b ON b.id = ps.bobin_id
     JOIN machines m ON m.id = ps.machine_id
     WHERE ps.status = 'boshlangan'
     ORDER BY ps.started_at DESC`
  );
  return rows;
}

export async function list(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const conditions = ['1=1'];
  const params = [];
  let i = 1;
  if (query.status) { conditions.push(`ps.status = $${i++}`); params.push(query.status); }
  if (query.machineId) { conditions.push(`ps.machine_id = $${i++}`); params.push(query.machineId); }
  const count = await db.query(
    `SELECT COUNT(*)::int AS total FROM production_sessions ps WHERE ${conditions.join(' AND ')}`,
    params
  );
  const q = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT ${SESSION_LIST_SELECT}
     FROM production_sessions ps
     JOIN bobins b ON b.id = ps.bobin_id
     LEFT JOIN machines m ON m.id = ps.machine_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ps.started_at ${order} LIMIT $${i++} OFFSET $${i}`,
    q
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}
