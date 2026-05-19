import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function list(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const conditions = ['1=1'];
  const params = [];
  let i = 1;
  if (query.status) { conditions.push(`status = $${i++}`); params.push(query.status); }
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM plots WHERE ${conditions.join(' AND ')}`, params);
  const q = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT * FROM plots WHERE ${conditions.join(' AND ')} ORDER BY opened_at ${order} LIMIT $${i++} OFFSET $${i}`,
    q
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}

export async function getActive() {
  const { rows } = await db.query(`SELECT * FROM plots WHERE status = 'ochiq' ORDER BY opened_at DESC LIMIT 1`);
  return rows[0] || null;
}

export async function create({ widthCm }, userId) {
  const active = await getActive();
  if (active) throw new AppError('Avval ochiq PLOTni yoping', 400);
  const codeRes = await db.query(`SELECT generate_plot_number() AS num`);
  const { rows } = await db.query(
    `INSERT INTO plots (plot_number, width_cm, opened_by) VALUES ($1,$2,$3) RETURNING *`,
    [codeRes.rows[0].num, widthCm, userId]
  );
  return rows[0];
}

export async function getById(id) {
  const plot = await db.query(`SELECT * FROM plots WHERE id = $1`, [id]);
  if (!plot.rows.length) throw new AppError('PLOT topilmadi', 404);
  const items = await db.query(`SELECT * FROM cut_products WHERE plot_id = $1`, [id]);
  return { ...plot.rows[0], items: items.rows };
}

export async function getSummary(id) {
  const { rows } = await db.query(`SELECT * FROM v_plot_summary WHERE id = $1`, [id]);
  if (!rows.length) throw new AppError('PLOT topilmadi', 404);
  return rows[0];
}

export async function addItem(plotId, cutProductId) {
  const plot = await db.query(`SELECT * FROM plots WHERE id = $1 AND status = 'ochiq'`, [plotId]);
  if (!plot.rows.length) throw new AppError('Ochiq PLOT topilmadi', 404);

  const prod = await db.query(`SELECT * FROM cut_products WHERE id = $1`, [cutProductId]);
  if (!prod.rows.length) throw new AppError('Kesilgan mahsulot topilmadi', 404);
  if (prod.rows[0].plot_id) throw new AppError('Mahsulot boshqa PLOTda', 400);

  const { rows } = await db.query(
    `UPDATE cut_products SET plot_id = $1 WHERE id = $2 RETURNING *`,
    [plotId, cutProductId]
  );
  const updated = await db.query(`SELECT * FROM plots WHERE id = $1`, [plotId]);
  return { product: rows[0], plot: updated.rows[0] };
}

export async function removeItem(plotId, cutProductId) {
  const { rows } = await db.query(
    `UPDATE cut_products SET plot_id = NULL WHERE id = $1 AND plot_id = $2 RETURNING *`,
    [cutProductId, plotId]
  );
  if (!rows.length) throw new AppError('Mahsulot topilmadi', 404);
  const plot = await db.query(`SELECT * FROM plots WHERE id = $1`, [plotId]);
  return { ok: true, plot: plot.rows[0] };
}

export async function close(plotId, userId) {
  const { rows } = await db.query(
    `UPDATE plots SET status = 'yopiq', closed_at = NOW(), closed_by = $1
     WHERE id = $2 AND status = 'ochiq' RETURNING *`,
    [userId, plotId]
  );
  if (!rows.length) throw new AppError('Ochiq PLOT topilmadi', 404);
  const nextCode = await db.query(`SELECT generate_plot_number() AS next_plot_number`);
  return { closedPlot: rows[0], nextPlotNumber: nextCode.rows[0].next_plot_number };
}
