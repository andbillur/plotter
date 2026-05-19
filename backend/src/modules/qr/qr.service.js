import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';

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
    if (data.status === 'omborxonada') allowedActions.push('start_production');
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

  throw new AppError('QR kod topilmadi', 404);
}

function buildResponse(type, data, roleName, entityActions) {
  const roleAllowed = ROLE_ACTIONS[roleName] || [];
  const allowedActions = entityActions.filter((a) => roleAllowed.includes(a));
  return { type, id: data.id, data, allowedActions };
}
