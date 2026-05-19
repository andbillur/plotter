import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';

export async function list() {
  const { rows } = await db.query(`SELECT * FROM machines ORDER BY name`);
  return rows;
}

export async function create(data) {
  const { rows } = await db.query(
    `INSERT INTO machines (name, machine_type, description) VALUES ($1,$2,$3) RETURNING *`,
    [data.name, data.machineType, data.description || null]
  );
  return rows[0];
}

export async function getStatus(id) {
  const machine = await db.query(`SELECT * FROM machines WHERE id = $1`, [id]);
  if (!machine.rows.length) throw new AppError('Mashina topilmadi', 404);

  const bobin = await db.query(
    `SELECT b.* FROM bobins b WHERE b.current_machine_id = $1 AND b.status = 'mashinada'`,
    [id]
  );
  const session = await db.query(
    `SELECT ps.* FROM production_sessions ps
     WHERE ps.machine_id = $1 AND ps.status = 'boshlangan' LIMIT 1`,
    [id]
  );
  return {
    machine: machine.rows[0],
    activeBobin: bobin.rows[0] || null,
    activeProductionSession: session.rows[0] || null,
  };
}
