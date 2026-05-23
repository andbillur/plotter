import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

const IN_TYPES = new Set(['kirim', 'kirim_savdo', 'kesishdan']);
const OUT_TYPES = new Set(['chiqim', 'chiqim_sotish', 'chiqim_ishlatish']);

const MOVEMENT_LABELS = {
  kirim: 'Kirim',
  kirim_savdo: 'Savdo (sotib olish)',
  chiqim: 'Chiqim',
  chiqim_sotish: 'Sotish (sota)',
  chiqim_ishlatish: 'Qayta ishlatish',
  kesishdan: 'Kesishdan',
};

export function validateMovement(warehouseType, movementType) {
  if (!['brak', 'makulatura'].includes(warehouseType)) {
    throw new AppError('Ombor turi: brak yoki makulatura', 400);
  }
  if (!MOVEMENT_LABELS[movementType]) {
    throw new AppError('Noto\'g\'ri harakat turi', 400);
  }
  if (movementType === 'chiqim_ishlatish' && warehouseType !== 'brak') {
    throw new AppError('Qayta ishlatish faqat brak omborida', 400);
  }
  if (movementType === 'chiqim_sotish' && warehouseType !== 'makulatura') {
    throw new AppError('Sotish (sota) faqat makulatura omborida', 400);
  }
}

export async function listStock() {
  const { rows } = await db.query(`SELECT * FROM scrap_stock ORDER BY warehouse_type`);
  return rows;
}

export async function listTransactions(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const conditions = ['1=1'];
  const params = [];
  let i = 1;
  if (query.warehouseType) {
    conditions.push(`st.warehouse_type = $${i++}`);
    params.push(query.warehouseType);
  }
  if (query.movementType) {
    conditions.push(`st.movement_type = $${i++}`);
    params.push(query.movementType);
  }
  const where = conditions.join(' AND ');
  const count = await db.query(
    `SELECT COUNT(*)::int AS total FROM scrap_transactions st WHERE ${where}`,
    params
  );
  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT st.*, u.full_name AS performed_by_name, cs.session_code AS cutting_session_code
     FROM scrap_transactions st
     LEFT JOIN users u ON u.id = st.performed_by
     LEFT JOIN cutting_sessions cs ON cs.id = st.cutting_session_id
     WHERE ${where}
     ORDER BY st.created_at ${order}
     LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}

async function applyMovement(client, data, userId) {
  const {
    warehouseType,
    movementType,
    quantityKg,
    pricePerKg,
    totalAmount,
    cuttingSessionId,
    counterparty,
    notes,
  } = data;
  const qty = Number(quantityKg);
  validateMovement(warehouseType, movementType);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new AppError('Og\'irlik 0 dan katta bo\'lishi kerak', 400);
  }

  if (movementType === 'chiqim_sotish') {
    const price = Number(pricePerKg);
    if (!Number.isFinite(price) || price < 0) {
      throw new AppError('Sotish narxi (1 kg) kiriting', 400);
    }
  }

  if (movementType === 'kirim_savdo' && !counterparty?.trim()) {
    throw new AppError('Savdo kirim uchun kontragent (kimdan) kiriting', 400);
  }

  const stockRes = await client.query(
    `SELECT current_weight_kg FROM scrap_stock WHERE warehouse_type = $1 FOR UPDATE`,
    [warehouseType]
  );
  if (!stockRes.rows.length) throw new AppError('Ombor topilmadi', 404);
  let balance = Number(stockRes.rows[0].current_weight_kg);

  if (OUT_TYPES.has(movementType)) {
    if (balance < qty - 0.0001) {
      throw new AppError(`Omborda yetarli qoldiq yo'q (${balance.toFixed(1)} kg)`, 400);
    }
    balance = Math.round((balance - qty) * 1000) / 1000;
  } else if (IN_TYPES.has(movementType)) {
    balance = Math.round((balance + qty) * 1000) / 1000;
  }

  let amount = totalAmount != null ? Number(totalAmount) : null;
  if (movementType === 'chiqim_sotish') {
    amount = Math.round(qty * Number(pricePerKg) * 100) / 100;
  } else if (movementType === 'kirim_savdo' && pricePerKg != null) {
    amount = Math.round(qty * Number(pricePerKg) * 100) / 100;
  }

  const { rows } = await client.query(
    `INSERT INTO scrap_transactions (
      warehouse_type, movement_type, quantity_kg, price_per_kg, total_amount,
      balance_after_kg, cutting_session_id, counterparty, notes, performed_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      warehouseType,
      movementType,
      qty,
      pricePerKg ?? null,
      amount,
      balance,
      cuttingSessionId || null,
      counterparty?.trim() || null,
      notes?.trim() || null,
      userId,
    ]
  );

  await client.query(
    `UPDATE scrap_stock SET current_weight_kg = $1, updated_at = NOW() WHERE warehouse_type = $2`,
    [balance, warehouseType]
  );

  return rows[0];
}

export async function addMovement(data, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const row = await applyMovement(client, data, userId);
    await client.query('COMMIT');
    return row;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Kesish sessiyasi bragini brak / makulatura omborlariga ajratish */
export async function allocateCuttingWaste(sessionId, { brakKg, makulaturaKg }, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const sess = await client.query(
      `SELECT * FROM cutting_sessions WHERE id = $1 FOR UPDATE`,
      [sessionId]
    );
    if (!sess.rows.length) throw new AppError('Kesish sessiyasi topilmadi', 404);
    const s = sess.rows[0];
    if (s.status !== 'tugallangan') {
      throw new AppError('Faqat tugallangan sessiyadan brak ajratiladi', 400);
    }

    const brak = Number(brakKg) || 0;
    const mak = Number(makulaturaKg) || 0;
    const waste = Number(s.waste_kg) || 0;
    const alreadyBrak = Number(s.waste_brak_kg) || 0;
    const alreadyMak = Number(s.waste_makulatura_kg) || 0;
    const remaining = Math.round((waste - alreadyBrak - alreadyMak) * 1000) / 1000;

    if (brak < 0 || mak < 0) throw new AppError('Manfiy og\'irlik mumkin emas', 400);
    const sum = Math.round((brak + mak) * 1000) / 1000;
    if (sum <= 0) throw new AppError('Kamida bitta omborga kg kiriting', 400);
    if (sum > remaining + 0.01) {
      throw new AppError(
        `Ajratish ${sum} kg, qolgan brak ${remaining} kg (jami brak ${waste} kg)`,
        400
      );
    }

    const results = [];
    if (brak > 0) {
      results.push(
        await applyMovement(
          client,
          {
            warehouseType: 'brak',
            movementType: 'kesishdan',
            quantityKg: brak,
            cuttingSessionId: sessionId,
            notes: `Kesish ${s.session_code}`,
          },
          userId
        )
      );
    }
    if (mak > 0) {
      results.push(
        await applyMovement(
          client,
          {
            warehouseType: 'makulatura',
            movementType: 'kesishdan',
            quantityKg: mak,
            cuttingSessionId: sessionId,
            notes: `Kesish ${s.session_code}`,
          },
          userId
        )
      );
    }

    await client.query(
      `UPDATE cutting_sessions SET
        waste_brak_kg = waste_brak_kg + $1,
        waste_makulatura_kg = waste_makulatura_kg + $2
       WHERE id = $3`,
      [brak, mak, sessionId]
    );

    await client.query('COMMIT');
    return {
      sessionId,
      allocatedBrakKg: brak,
      allocatedMakulaturaKg: mak,
      remainingWasteKg: Math.round((remaining - sum) * 1000) / 1000,
      transactions: results,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getCuttingWasteStatus(sessionId) {
  const { rows } = await db.query(
    `SELECT id, session_code, status, waste_kg, waste_brak_kg, waste_makulatura_kg,
            input_weight_kg, total_output_kg
     FROM cutting_sessions WHERE id = $1`,
    [sessionId]
  );
  if (!rows.length) throw new AppError('Sessiya topilmadi', 404);
  const s = rows[0];
  const waste = Number(s.waste_kg) || 0;
  const allocated =
    Number(s.waste_brak_kg) + Number(s.waste_makulatura_kg);
  return {
    ...s,
    waste_kg: waste,
    remaining_waste_kg: Math.round((waste - allocated) * 1000) / 1000,
  };
}

export { MOVEMENT_LABELS };
