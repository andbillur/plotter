import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { bobinCanStartProduction } from '../../utils/bobinStock.js';

const ROLE_ACTIONS = {
  super_admin: ['start_production', 'start_cutting', 'add_to_plot', 'receive_bobin', 'receive_clay', 'add_to_shipment', 'register_warehouse'],
  omborchi: ['receive_bobin', 'receive_clay', 'register_warehouse', 'add_to_shipment'],
  mashina_operatori: ['start_production'],
  kesuvchi_ishchi: ['start_cutting', 'add_to_plot', 'register_warehouse', 'add_to_shipment'],
  direktor: [],
};

export async function scan(qrCode, roleName) {
  let type;
  let data;
  let allowedActions = [];

  const bobin = await db.query(`SELECT * FROM bobins WHERE qr_code = $1`, [qrCode]);
  if (bobin.rows.length) {
    type = 'bobin';
    data = bobin.rows[0];
    if (bobinCanStartProduction(data)) {
      allowedActions.push('start_production');
    }
    return buildResponse(type, data, roleName, allowedActions);
  }

  const pp = await db.query(`SELECT * FROM parent_papers WHERE qr_code = $1`, [qrCode]);
  if (pp.rows.length) {
    type = 'parent_paper';
    data = pp.rows[0];
    if (!data.is_cut) allowedActions.push('start_cutting');
    return buildResponse(type, data, roleName, allowedActions);
  }

  const cut = await db.query(`SELECT * FROM cut_products WHERE qr_code = $1`, [qrCode]);
  if (cut.rows.length) {
    type = 'cut_product';
    data = cut.rows[0];
    if (!data.plot_id && data.stock_status === 'kesildi') allowedActions.push('add_to_plot');
    if (data.stock_status === 'kesildi' || data.stock_status === 'plotda') {
      allowedActions.push('register_warehouse');
    }
    if (data.stock_status === 'omborxonada') allowedActions.push('add_to_shipment');
    return buildResponse(type, data, roleName, allowedActions);
  }

  const scrapLot = await db.query(`SELECT * FROM scrap_lots WHERE qr_code = $1`, [qrCode]);
  if (scrapLot.rows.length) {
    const lot = scrapLot.rows[0];
    type = lot.warehouse_type === 'brak' ? 'scrap_brak' : 'scrap_makulatura';
    data = lot;
    if (lot.status === 'omborxona') {
      allowedActions.push('scrap_out');
    }
    return buildResponse(type, data, roleName, allowedActions);
  }

  const ps = await db.query(
    `SELECT * FROM production_sessions WHERE session_code = $1`,
    [qrCode]
  );
  if (ps.rows.length) {
    const papers = await db.query(
      `SELECT id, qr_code, weight_kg, is_cut FROM parent_papers
       WHERE source_session_id = $1 ORDER BY created_at`,
      [ps.rows[0].id]
    );
    const available = papers.rows.filter((p) => !p.is_cut);
    return {
      type: 'production_session',
      id: ps.rows[0].id,
      data: ps.rows[0],
      parentPapers: papers.rows,
      parentPapersAvailable: available,
      allowedActions: [],
      hint:
        available.length > 0
          ? 'Ishlab chiqarish sessiyasi (PS). Kesish uchun PP- kodini tanlang.'
          : 'Ishlab chiqarish sessiyasi (PS). Avval SPLIT qiling (Ishlab chiqarish sahifasi).',
    };
  }

  throw new AppError('QR kod topilmadi', 404);
}

function buildResponse(type, data, roleName, entityActions) {
  const roleAllowed = ROLE_ACTIONS[roleName] || [];
  const allowedActions = entityActions.filter((a) => roleAllowed.includes(a));
  return { type, id: data.id, data, allowedActions };
}
