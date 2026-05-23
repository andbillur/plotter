/**
 * Barcha tugallangan ishlab chiqarish tannarxlarini yangi formula bilan qayta hisoblaydi.
 *
 * cd backend
 * npm run recalc-labor          — farq bor yoki xato bo‘lganlarni tuzatadi
 * npm run recalc-labor -- --all — ishchisi bor HAMMA sessiyalarni qayta yozadi
 */
import 'dotenv/config';
import pg from 'pg';
import {
  shouldRecalcProductionCostReport,
  repairProductionCostReport,
} from '../src/utils/productionCostRepair.js';

const forceAll = process.argv.includes('--all');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function sessionHasWorkers(sessionId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM production_session_workers
     WHERE session_id = $1 AND meters_per_minute IS NOT NULL AND meters_per_minute > 0`,
    [sessionId]
  );
  return Number(rows[0]?.n) > 0;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL topilmadi. backend/.env ni tekshiring.');
    process.exit(1);
  }

  await client.connect();

  const { rows } = await client.query(
    `SELECT pcr.*, ps.id AS session_id, ps.session_code, b.width_mm, b.grammaj
     FROM production_cost_reports pcr
     JOIN production_sessions ps ON ps.id = pcr.session_id
     JOIN bobins b ON b.id = ps.bobin_id
     WHERE ps.status = 'tugallangan'
     ORDER BY ps.finished_at NULLS LAST, pcr.calculated_at`
  );

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const hasWorkers = await sessionHasWorkers(row.session_id);
      const repaired = await repairProductionCostReport(
        row,
        row.session_id,
        row.width_mm,
        row.grammaj
      );

      const mustUpdate =
        forceAll && hasWorkers
          ? true
          : shouldRecalcProductionCostReport(row, repaired);

      if (!mustUpdate) {
        skipped++;
        continue;
      }

      await client.query(
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

      const oldLabor = Number(row.labor_workers_cost) || Number(row.labor_cost_total);
      const newLabor = Number(repaired.labor_workers_cost) || Number(repaired.labor_cost_total);
      console.log(
        `✓ ${row.session_code || row.session_id}: ish haqi ${oldLabor.toLocaleString('uz-UZ')} → ${newLabor.toLocaleString('uz-UZ')} so'm`
      );
      fixed++;
    } catch (err) {
      failed++;
      console.error(`✗ ${row.session_code || row.session_id}:`, err.message);
    }
  }

  console.log(`\nTayyor: ${fixed} tuzatildi, ${skipped} o‘zgartirilmadi, ${failed} xato.`);
  if (forceAll) {
    console.log('(--all: ishchisi bor barcha sessiyalar qayta yozildi)');
  }
  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
