import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { generateQrCode } from '../../utils/qr.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function listStock(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const conditions = ["stock_status = 'omborxonada'"];
  const params = [];
  let i = 1;
  if (query.color) {
    conditions.push(`color = $${i++}`);
    params.push(query.color);
  }
  if (query.widthCm) {
    conditions.push(`width_cm = $${i++}`);
    params.push(query.widthCm);
  }
  const count = await db.query(
    `SELECT COUNT(*)::int AS total FROM cut_products WHERE ${conditions.join(' AND ')}`,
    params
  );
  const q = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT cp.*, p.plot_number FROM cut_products cp
     LEFT JOIN plots p ON p.id = cp.plot_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY cp.created_at ${order} LIMIT $${i++} OFFSET $${i}`,
    q
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}

export async function getSummary() {
  const { rows } = await db.query(
    `SELECT
      COUNT(*)::int AS total_items,
      COALESCE(SUM(weight_kg), 0) AS total_weight_kg,
      color,
      width_cm,
      COUNT(*)::int AS cnt
     FROM cut_products WHERE stock_status = 'omborxonada'
     GROUP BY color, width_cm
     ORDER BY color, width_cm`
  );
  const total = await db.query(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(weight_kg),0) AS kg
     FROM cut_products WHERE stock_status = 'omborxonada'`
  );
  return { summary: rows, total: total.rows[0] };
}

export async function registerProduct(data, userId) {
  const qr = data.qrCode || generateQrCode('FG');
  if (data.cutProductId) {
    const { rows } = await db.query(
      `UPDATE cut_products SET
        stock_status = 'omborxonada',
        color = COALESCE($1, color),
        qr_code = COALESCE(qr_code, $2)
       WHERE id = $3 AND stock_status IN ('kesildi', 'plotda')
       RETURNING *`,
      [data.color || 'white', qr, data.cutProductId]
    );
    if (!rows.length) throw new AppError('Mahsulot topilmadi yoki allaqachon omborda', 400);
    return rows[0];
  }
  if (!data.widthCm || !data.weightKg) {
    throw new AppError('Eni va og\'irlik kiritilishi shart', 400);
  }
  const { rows } = await db.query(
    `INSERT INTO cut_products (qr_code, width_cm, weight_kg, length_m, color, stock_status)
     VALUES ($1,$2,$3,$4,$5,'omborxonada') RETURNING *`,
    [qr, data.widthCm, data.weightKg, data.lengthM || null, data.color || 'white']
  );
  return rows[0];
}

export async function registerFromQr(qrCode, data = {}) {
  const { rows } = await db.query(`SELECT * FROM cut_products WHERE qr_code = $1`, [qrCode]);
  if (!rows.length) throw new AppError('QR topilmadi', 404);
  const p = rows[0];
  if (p.stock_status === 'jo_natilgan') throw new AppError('Mahsulot allaqachon jo\'natilgan', 400);
  const { rows: updated } = await db.query(
    `UPDATE cut_products SET stock_status = 'omborxonada',
      color = COALESCE($1, color), plot_id = NULL
     WHERE id = $2 RETURNING *`,
    [data.color || p.color, p.id]
  );
  return updated[0];
}

export async function removeProduct(id) {
  const { rows } = await db.query(`SELECT * FROM cut_products WHERE id = $1`, [id]);
  if (!rows.length) throw new AppError('Mahsulot topilmadi', 404);
  const p = rows[0];
  if (p.stock_status !== 'omborxonada') {
    throw new AppError('Faqat ombordagi mahsulotni o\'chirish mumkin', 400);
  }
  const ship = await db.query(
    `SELECT 1 FROM shipment_items WHERE cut_product_id = $1 LIMIT 1`,
    [id]
  );
  if (ship.rows.length) {
    throw new AppError('Jo\'natmaga qo\'shilgan mahsulotni o\'chirib bo\'lmaydi', 400);
  }
  if (p.plot_id) {
    await db.query(
      `UPDATE plots SET
        total_items = GREATEST(0, total_items - 1),
        total_weight_kg = GREATEST(0, total_weight_kg - $1)
       WHERE id = $2`,
      [p.weight_kg, p.plot_id]
    );
  }
  await db.query(`DELETE FROM cut_products WHERE id = $1`, [id]);
  return { ok: true, qr_code: p.qr_code };
}
