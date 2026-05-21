import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function getBalance() {
  const { rows } = await db.query(`SELECT * FROM clay_inventory LIMIT 1`);
  return rows[0];
}

export async function receive(data, userId) {
  const inv = await getBalance();
  const qtyKg = data.quantityKg ?? (data.quantityBags * (inv?.bag_weight_kg || 20));
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO clay_transactions (operation, quantity_bags, quantity_kg, balance_after_kg, notes, performed_by)
       VALUES ('kirim', $1, $2, 0, $3, $4) RETURNING *`,
      [data.quantityBags || null, qtyKg, data.notes || null, userId]
    );
    await client.query('COMMIT');
    const bal = await getBalance();
    return { transaction: rows[0], balance: bal };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function listTransactions(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const conditions = ['1=1'];
  const params = [];
  let i = 1;
  if (query.operation) { conditions.push(`operation = $${i++}`); params.push(query.operation); }
  if (query.from) { conditions.push(`created_at >= $${i++}`); params.push(query.from); }
  if (query.to) { conditions.push(`created_at <= $${i++}`); params.push(query.to); }
  const count = await db.query(
    `SELECT COUNT(*)::int AS total FROM clay_transactions WHERE ${conditions.join(' AND ')}`,
    params
  );
  const q = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT * FROM clay_transactions WHERE ${conditions.join(' AND ')}
     ORDER BY created_at ${order} LIMIT $${i++} OFFSET $${i}`,
    q
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}

export async function removeTransaction(id) {
  const { rows } = await db.query(`SELECT * FROM clay_transactions WHERE id = $1`, [id]);
  if (!rows.length) throw new AppError('Yozuv topilmadi', 404);
  const tx = rows[0];
  if (tx.production_session_id) {
    throw new AppError('Ishlab chiqarishga bog\'langan kley yozuvini o\'chirib bo\'lmaydi', 400);
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    if (tx.operation === 'kirim') {
      const inv = await client.query(`SELECT current_stock_kg FROM clay_inventory LIMIT 1 FOR UPDATE`);
      const next = Number(inv.rows[0].current_stock_kg) - Number(tx.quantity_kg);
      if (next < 0) throw new AppError('Qoldiq manfiy bo\'ladi — avval boshqa kirimlarni tekshiring', 400);
      await client.query(
        `UPDATE clay_inventory SET current_stock_kg = $1, updated_at = NOW()`,
        [next]
      );
    } else {
      await client.query(
        `UPDATE clay_inventory SET current_stock_kg = current_stock_kg + $1, updated_at = NOW()`,
        [tx.quantity_kg]
      );
    }
    await client.query(`DELETE FROM clay_transactions WHERE id = $1`, [id]);
    await client.query('COMMIT');
    const bal = await getBalance();
    return { ok: true, balance: bal };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
