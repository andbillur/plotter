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

async function moveToWarehouse(p, data) {
  if (p.stock_status === 'omborxonada') {
    throw new AppError('Bu barcode allaqachon omborda', 400);
  }
  if (p.stock_status === 'jo_natilgan') {
    throw new AppError('Mahsulot allaqachon jo\'natilgan', 400);
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
  const { rows: updated } = await db.query(
    `UPDATE cut_products SET
      stock_status = 'omborxonada',
      plot_id = NULL,
      color = COALESCE($1, color),
      width_cm = COALESCE($2, width_cm),
      weight_kg = COALESCE($3, weight_kg),
      length_m = COALESCE($4, length_m)
     WHERE id = $5 RETURNING *`,
    [
      data.color || p.color,
      data.widthCm ?? p.width_cm,
      data.weightKg ?? p.weight_kg,
      data.lengthM ?? p.length_m,
      p.id,
    ]
  );
  return updated[0];
}

export async function registerProduct(data, userId) {
  if (data.cutProductId) {
    const { rows } = await db.query(`SELECT * FROM cut_products WHERE id = $1`, [data.cutProductId]);
    if (!rows.length) throw new AppError('Mahsulot topilmadi', 404);
    return moveToWarehouse(rows[0], data);
  }

  const qr = data.qrCode?.trim();
  if (qr) {
    const existing = await db.query(`SELECT * FROM cut_products WHERE qr_code = $1`, [qr]);
    if (existing.rows.length) {
      return moveToWarehouse(existing.rows[0], data);
    }
    if (!data.widthCm || !data.weightKg) {
      throw new AppError('Tarozidan og\'irlik va eni (sm) kiriting', 400);
    }
    const { rows } = await db.query(
      `INSERT INTO cut_products (qr_code, width_cm, weight_kg, length_m, color, stock_status)
       VALUES ($1,$2,$3,$4,$5,'omborxonada') RETURNING *`,
      [qr, data.widthCm, data.weightKg, data.lengthM || null, data.color || 'white']
    );
    return rows[0];
  }

  if (!data.widthCm || !data.weightKg) {
    throw new AppError('Barcode skanerlang yoki og\'irlik va eni kiriting', 400);
  }
  const autoQr = generateQrCode('FG');
  const { rows } = await db.query(
    `INSERT INTO cut_products (qr_code, width_cm, weight_kg, length_m, color, stock_status)
     VALUES ($1,$2,$3,$4,$5,'omborxonada') RETURNING *`,
    [autoQr, data.widthCm, data.weightKg, data.lengthM || null, data.color || 'white']
  );
  return rows[0];
}

export async function registerFromQr(qrCode, data = {}) {
  const code = qrCode.trim();
  const { rows } = await db.query(`SELECT * FROM cut_products WHERE qr_code = $1`, [code]);
  if (!rows.length) {
    if (!data.weightKg || !data.widthCm) {
      throw new AppError('Yangi etiket — tarozidan og\'irlik va eni kiriting', 400);
    }
    const inserted = await db.query(
      `INSERT INTO cut_products (qr_code, width_cm, weight_kg, length_m, color, stock_status)
       VALUES ($1,$2,$3,$4,$5,'omborxonada') RETURNING *`,
      [code, data.widthCm, data.weightKg, data.lengthM || null, data.color || 'white']
    );
    return inserted.rows[0];
  }
  return moveToWarehouse(rows[0], data);
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
