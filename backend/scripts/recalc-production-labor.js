/**
 * Eski ishlab chiqarish tannarx hisobotlaridagi noto‘g‘ri (juda katta) ish haqini tuzatadi.
 *
 * Ishlatish: cd backend && node scripts/recalc-production-labor.js
 */
import 'dotenv/config';
import pg from 'pg';
import {
  isInflatedProductionLaborReport,
  repairProductionCostReport,
} from '../src/utils/productionCostRepair.js';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  const { rows } = await client.query(
    `SELECT pcr.*, ps.id AS session_id, b.width_mm, b.grammaj
     FROM production_cost_reports pcr
     JOIN production_sessions ps ON ps.id = pcr.session_id
     JOIN bobins b ON b.id = ps.bobin_id
     WHERE ps.status = 'tugallangan'
     ORDER BY pcr.calculated_at`
  );

  let fixed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!isInflatedProductionLaborReport(row)) {
      skipped++;
      continue;
    }

    const repaired = await repairProductionCostReport(
      row,
      row.session_id,
      row.width_mm,
      row.grammaj
    );

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

    const oldLabor = Number(row.labor_workers_cost);
    const newLabor = Number(repaired.labor_workers_cost);
    console.log(
      `✓ ${row.session_id}: ish haqi ${oldLabor.toLocaleString('uz-UZ')} → ${newLabor.toLocaleString('uz-UZ')} so'm`
    );
    fixed++;
  }

  console.log(`\nTayyor: ${fixed} ta tuzatildi, ${skipped} ta o‘zgartirilmadi.`);
  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
