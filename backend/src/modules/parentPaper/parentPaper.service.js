import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { generateQrCode } from '../../utils/qr.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function split({ sessionId, children }, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const sess = await client.query(
      `SELECT * FROM production_sessions WHERE id = $1 AND status = 'tugallangan' FOR UPDATE`,
      [sessionId]
    );
    if (!sess.rows.length) throw new AppError('Tugallangan sessiya topilmadi', 404);
    const s = sess.rows[0];
    const totalWeight = children.reduce((a, c) => a + c.weightKg, 0);
    const output = parseFloat(s.output_weight_kg);
    if (Math.abs(totalWeight - output) > 0.5) {
      throw new AppError(`Bolalar og'irligi jami (${totalWeight}) output (${output}) ga mos emas`, 400);
    }

    const totalClay = parseFloat(s.total_clay_used_kg) || 0;
    const created = [];

    for (const child of children) {
      const qr = child.qrCode || generateQrCode('PP');
      const clayShare = totalWeight > 0 ? (child.weightKg / totalWeight) * totalClay : 0;
      const costPerKg = s.output_weight_kg
        ? (await client.query(`SELECT cost_per_kg_output FROM production_cost_reports WHERE session_id = $1 LIMIT 1`, [sessionId])).rows[0]?.cost_per_kg_output
        : null;

      const { rows } = await client.query(
        `INSERT INTO parent_papers (
          qr_code, source_session_id, weight_kg, initial_weight_kg,
          clay_share_kg, cost_per_kg, total_cost, created_by
        ) VALUES ($1,$2,$3,$3,$4,$5,$6,$7) RETURNING *`,
        [
          qr, sessionId, child.weightKg, clayShare,
          costPerKg, costPerKg ? costPerKg * child.weightKg : null,
          userId,
        ]
      );
      created.push(rows[0]);
    }

    for (const pp of created) {
      await client.query(
        `INSERT INTO paper_lineage (ancestor_id, descendant_id, depth)
         VALUES ($1, $1, 0) ON CONFLICT DO NOTHING`,
        [pp.id]
      );
    }

    await client.query('COMMIT');
    return created;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getById(id) {
  const { rows } = await db.query(`SELECT * FROM parent_papers WHERE id = $1`, [id]);
  if (!rows.length) throw new AppError('Ona qoghoz topilmadi', 404);
  return rows[0];
}

export async function getByQr(qrCode) {
  const { rows } = await db.query(`SELECT * FROM parent_papers WHERE qr_code = $1`, [qrCode]);
  if (!rows.length) throw new AppError('Ona qoghoz topilmadi', 404);
  return rows[0];
}

export async function lineage(id) {
  const { rows } = await db.query(
    `SELECT pl.depth, pp.*
     FROM paper_lineage pl
     JOIN parent_papers pp ON pp.id = pl.ancestor_id
     WHERE pl.descendant_id = $1
     ORDER BY pl.depth`,
    [id]
  );
  const self = await getById(id);
  return { paper: self, ancestors: rows };
}

export async function list(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM parent_papers`);
  const { rows } = await db.query(
    `SELECT * FROM parent_papers ORDER BY created_at ${order} LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}

/** Kesish uchun: hali kesilmagan ona qog'ozlar */
export async function listAvailableForCutting() {
  const { rows } = await db.query(
    `SELECT pp.id, pp.qr_code, pp.weight_kg, pp.clay_share_kg, pp.created_at,
            ps.session_code
     FROM parent_papers pp
     LEFT JOIN production_sessions ps ON ps.id = pp.source_session_id
     WHERE pp.is_cut = false
     ORDER BY pp.created_at DESC
     LIMIT 100`
  );
  return rows;
}
