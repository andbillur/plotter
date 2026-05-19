import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { generateQrCode } from '../../utils/qr.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function start({ parentPaperQrCode, machineId, inputWeightKg }, cutterId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const pp = await client.query(
      `SELECT * FROM parent_papers WHERE qr_code = $1 FOR UPDATE`,
      [parentPaperQrCode]
    );
    if (!pp.rows.length) throw new AppError('Ona qoghoz topilmadi', 404);
    const paper = pp.rows[0];
    if (paper.is_cut) throw new AppError('Bu ona qoghoz allaqachon kesilgan', 400);

    const open = await client.query(
      `SELECT id FROM cutting_sessions WHERE parent_paper_id = $1 AND status = 'boshlangan'`,
      [paper.id]
    );
    if (open.rows.length) throw new AppError('Kesish sessiyasi allaqachon ochiq', 400);

    const codeRes = await client.query(`SELECT generate_cutting_code() AS code`);
    const { rows } = await client.query(
      `INSERT INTO cutting_sessions (session_code, parent_paper_id, machine_id, cutter_id, input_weight_kg)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [codeRes.rows[0].code, paper.id, machineId || null, cutterId, inputWeightKg]
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

export async function addProduct(sessionId, data) {
  const sess = await db.query(
    `SELECT * FROM cutting_sessions WHERE id = $1 AND status = 'boshlangan'`,
    [sessionId]
  );
  if (!sess.rows.length) throw new AppError('Kesish sessiyasi topilmadi', 404);

  const qr = data.qrCode || generateQrCode('CUT');
  const { rows } = await db.query(
    `INSERT INTO cut_products (qr_code, cutting_session_id, parent_paper_id, width_cm, weight_kg, length_m, color, stock_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'kesildi') RETURNING *`,
    [
      qr, sessionId, sess.rows[0].parent_paper_id, data.widthCm, data.weightKg,
      data.lengthM || null, data.color || 'white',
    ]
  );

  await db.query(
    `UPDATE cutting_sessions SET total_output_kg = (
      SELECT COALESCE(SUM(weight_kg),0) FROM cut_products WHERE cutting_session_id = $1
    ) WHERE id = $1`,
    [sessionId]
  );

  const updated = await db.query(`SELECT * FROM cutting_sessions WHERE id = $1`, [sessionId]);
  return { product: rows[0], session: updated.rows[0] };
}

export async function removeProduct(sessionId, productId) {
  const { rowCount } = await db.query(
    `DELETE FROM cut_products WHERE id = $1 AND cutting_session_id = $2`,
    [productId, sessionId]
  );
  if (!rowCount) throw new AppError('Mahsulot topilmadi', 404);
  await db.query(
    `UPDATE cutting_sessions SET total_output_kg = (
      SELECT COALESCE(SUM(weight_kg),0) FROM cut_products WHERE cutting_session_id = $1
    ) WHERE id = $1`,
    [sessionId]
  );
  return { ok: true };
}

export async function finish(sessionId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const sess = await client.query(
      `SELECT * FROM cutting_sessions WHERE id = $1 FOR UPDATE`,
      [sessionId]
    );
    if (!sess.rows.length) throw new AppError('Sessiya topilmadi', 404);

    await client.query(
      `UPDATE cutting_sessions SET status = 'tugallangan', finished_at = NOW() WHERE id = $1`,
      [sessionId]
    );
    await client.query(
      `UPDATE parent_papers SET is_cut = true, updated_at = NOW() WHERE id = $1`,
      [sess.rows[0].parent_paper_id]
    );
    const updated = await client.query(`SELECT * FROM cutting_sessions WHERE id = $1`, [sessionId]);
    const products = await client.query(
      `SELECT * FROM cut_products WHERE cutting_session_id = $1`,
      [sessionId]
    );
    await client.query('COMMIT');
    return { session: updated.rows[0], products: products.rows };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getById(id) {
  const sess = await db.query(`SELECT * FROM cutting_sessions WHERE id = $1`, [id]);
  if (!sess.rows.length) throw new AppError('Sessiya topilmadi', 404);
  const products = await db.query(`SELECT * FROM cut_products WHERE cutting_session_id = $1`, [id]);
  return { ...sess.rows[0], products: products.rows };
}

export async function wasteReport(id) {
  const s = await getById(id);
  return {
    sessionId: s.id,
    sessionCode: s.session_code,
    inputWeightKg: s.input_weight_kg,
    totalOutputKg: s.total_output_kg,
    wasteKg: s.waste_kg,
    wastePercent: s.waste_percent,
    productCount: s.products.length,
  };
}

export async function list(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM cutting_sessions`);
  const { rows } = await db.query(
    `SELECT * FROM cutting_sessions ORDER BY started_at ${order} LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}
