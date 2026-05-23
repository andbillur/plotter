import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { generateQrCode } from '../../utils/qr.js';
import { MIN_BOBIN_REMAINING_KG, MIN_BOBIN_REMAINING_M } from '../../utils/bobinStock.js';

const SORT_COLS = ['created_at', 'grammaj', 'current_weight_kg', 'status'];

export async function list(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const conditions = ['1=1'];
  const params = [];
  let i = 1;
  if (query.status) { conditions.push(`status = $${i++}`); params.push(query.status); }
  if (query.status === 'omborxonada') {
    conditions.push(`current_weight_kg > $${i++}`);
    params.push(MIN_BOBIN_REMAINING_KG);
    conditions.push(`current_length_m > $${i++}`);
    params.push(MIN_BOBIN_REMAINING_M);
  }
  if (query.grammaj) { conditions.push(`grammaj = $${i++}`); params.push(query.grammaj); }
  if (query.color) { conditions.push(`color = $${i++}`); params.push(query.color); }
  const sort = SORT_COLS.includes(query.sort) ? query.sort : 'created_at';
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM bobins WHERE ${conditions.join(' AND ')}`, params);
  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT * FROM bobins WHERE ${conditions.join(' AND ')}
     ORDER BY ${sort} ${order} LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}

export async function getById(id) {
  const { rows } = await db.query(`SELECT * FROM bobins WHERE id = $1`, [id]);
  if (!rows.length) throw new AppError('Bobin topilmadi', 404);
  return rows[0];
}

export async function getByQr(qrCode) {
  const { rows } = await db.query(`SELECT * FROM bobins WHERE qr_code = $1`, [qrCode]);
  if (!rows.length) throw new AppError('Bobin topilmadi', 404);
  return rows[0];
}

export async function create(data, userId) {
  const qr = data.qrCode || generateQrCode('BOB');
  const { rows } = await db.query(
    `INSERT INTO bobins (
      qr_code, grammaj, color, initial_weight_kg, current_weight_kg,
      initial_length_m, current_length_m, width_mm, supplier_name, batch_number, received_by
    ) VALUES ($1,$2,$3,$4,$4,$5,$5,$6,$7,$8,$9) RETURNING *`,
    [
      qr, data.grammaj, data.color || 'white',
      data.initialWeightKg, data.initialLengthM, data.widthMm || null,
      data.supplierName || null, data.batchNumber || null, userId,
    ]
  );
  await db.query(
    `INSERT INTO bobin_transactions (bobin_id, transaction_type, weight_change_kg, length_change_m, reason, performed_by)
     VALUES ($1, 'kirim', $2, $3, 'Yangi bobin qabul qilindi', $4)`,
    [rows[0].id, data.initialWeightKg, data.initialLengthM, userId]
  );
  return rows[0];
}

export async function update(id, data) {
  const bobin = await getById(id);
  if (bobin.status === 'mashinada') {
    throw new AppError('Mashinadagi bobinni tahrirlab bo\'lmaydi — avval sessiyani yakunlang', 400);
  }

  const fields = [];
  const vals = [];
  let i = 1;
  const map = {
    grammaj: 'grammaj',
    color: 'color',
    widthMm: 'width_mm',
    currentWeightKg: 'current_weight_kg',
    currentLengthM: 'current_length_m',
    status: 'status',
    supplierName: 'supplier_name',
    batchNumber: 'batch_number',
  };
  for (const [k, col] of Object.entries(map)) {
    if (data[k] !== undefined) {
      fields.push(`${col} = $${i++}`);
      vals.push(data[k]);
    }
  }
  if (!fields.length) throw new AppError('Yangilash uchun ma\'lumot yo\'q', 400);

  if (data.status === 'omborxonada') {
    const kg = Number(data.currentWeightKg ?? bobin.current_weight_kg);
    const m = Number(data.currentLengthM ?? bobin.current_length_m);
    if (kg <= MIN_BOBIN_REMAINING_KG || m <= MIN_BOBIN_REMAINING_M) {
      throw new AppError('Omborga qaytarish uchun og\'irlik va uzunlik 0 dan katta bo\'lishi kerak', 400);
    }
  }

  fields.push('updated_at = NOW()');
  vals.push(id);
  const { rows } = await db.query(
    `UPDATE bobins SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!rows.length) throw new AppError('Bobin topilmadi', 404);
  return rows[0];
}

export async function stockSummary() {
  const { rows } = await db.query(`SELECT * FROM v_bobin_stock`);
  return rows;
}

export async function remove(id) {
  const bobin = await getById(id);
  if (bobin.status === 'mashinada') {
    throw new AppError('Mashinadagi bobinni o\'chirib bo\'lmaydi', 400);
  }
  const used = await db.query(
    `SELECT COUNT(*)::int AS n FROM production_sessions WHERE bobin_id = $1`,
    [id]
  );
  if (used.rows[0].n > 0) {
    throw new AppError('Ishlab chiqarishda ishlatilgan bobinni o\'chirib bo\'lmaydi', 400);
  }
  await db.query(`DELETE FROM bobin_transactions WHERE bobin_id = $1`, [id]);
  const { rowCount } = await db.query(`DELETE FROM bobins WHERE id = $1`, [id]);
  if (!rowCount) throw new AppError('Bobin topilmadi', 404);
  return { ok: true, qr_code: bobin.qr_code };
}
