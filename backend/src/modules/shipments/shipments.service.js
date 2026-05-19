import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function list(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM shipments`);
  const { rows } = await db.query(
    `SELECT * FROM shipments ORDER BY created_at ${order} LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}

export async function create(data, userId) {
  const codeRes = await db.query(`SELECT generate_shipment_code() AS code`);
  const { rows } = await db.query(
    `INSERT INTO shipments (shipment_code, destination, customer_name, notes, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [codeRes.rows[0].code, data.destination || null, data.customerName || null, data.notes || null, userId]
  );
  return rows[0];
}

export async function getById(id) {
  const ship = await db.query(`SELECT * FROM shipments WHERE id = $1`, [id]);
  if (!ship.rows.length) throw new AppError('Jo\'natma topilmadi', 404);
  const items = await db.query(
    `SELECT si.*, cp.qr_code AS product_qr FROM shipment_items si
     JOIN cut_products cp ON cp.id = si.cut_product_id
     WHERE si.shipment_id = $1 ORDER BY si.scanned_at`,
    [id]
  );
  return { ...ship.rows[0], items: items.rows };
}

export async function addByQr(shipmentId, qrCode) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const ship = await client.query(
      `SELECT * FROM shipments WHERE id = $1 AND status = 'tayyorlanmoqda' FOR UPDATE`,
      [shipmentId]
    );
    if (!ship.rows.length) throw new AppError('Jo\'natma topilmadi yoki yopilgan', 404);

    const prod = await client.query(
      `SELECT * FROM cut_products WHERE qr_code = $1 FOR UPDATE`,
      [qrCode]
    );
    if (!prod.rows.length) throw new AppError('QR kod topilmadi', 404);
    const p = prod.rows[0];
    if (p.stock_status !== 'omborxonada') {
      throw new AppError('Mahsulot tayyor omborda emas', 400);
    }

    await client.query(
      `INSERT INTO shipment_items (shipment_id, cut_product_id, qr_code, weight_kg, width_cm, color)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [shipmentId, p.id, p.qr_code, p.weight_kg, p.width_cm, p.color]
    );

    await client.query(
      `UPDATE cut_products SET stock_status = 'jo_natilgan' WHERE id = $1`,
      [p.id]
    );

    await client.query(
      `UPDATE shipments SET
        total_items = (SELECT COUNT(*) FROM shipment_items WHERE shipment_id = $1),
        total_weight_kg = (SELECT COALESCE(SUM(weight_kg),0) FROM shipment_items WHERE shipment_id = $1)
       WHERE id = $1`,
      [shipmentId]
    );

    const updated = await client.query(`SELECT * FROM shipments WHERE id = $1`, [shipmentId]);
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function finish(shipmentId) {
  const { rows } = await db.query(
    `UPDATE shipments SET status = 'jo_natilgan', shipped_at = NOW()
     WHERE id = $1 AND status = 'tayyorlanmoqda' RETURNING *`,
    [shipmentId]
  );
  if (!rows.length) throw new AppError('Jo\'natma topilmadi', 404);
  return rows[0];
}

export async function removeItem(shipmentId, itemId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const item = await client.query(
      `DELETE FROM shipment_items WHERE id = $1 AND shipment_id = $2 RETURNING *`,
      [itemId, shipmentId]
    );
    if (!item.rows.length) throw new AppError('Element topilmadi', 404);
    await client.query(
      `UPDATE cut_products SET stock_status = 'omborxonada' WHERE id = $1`,
      [item.rows[0].cut_product_id]
    );
    await client.query(
      `UPDATE shipments SET
        total_items = (SELECT COUNT(*) FROM shipment_items WHERE shipment_id = $1),
        total_weight_kg = (SELECT COALESCE(SUM(weight_kg),0) FROM shipment_items WHERE shipment_id = $1)
       WHERE id = $1`,
      [shipmentId]
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
