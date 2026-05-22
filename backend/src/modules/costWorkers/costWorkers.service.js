import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';

export async function listWorkers(department) {
  const params = [];
  let where = 'is_active = true';
  if (department) {
    where += ' AND department = $1';
    params.push(department);
  }
  const { rows } = await db.query(
    `SELECT * FROM cost_workers WHERE ${where} ORDER BY full_name`,
    params
  );
  return rows;
}

export async function listAllWorkers() {
  const { rows } = await db.query(`SELECT * FROM cost_workers ORDER BY department, full_name`);
  return rows;
}

export async function createWorker(data) {
  const { rows } = await db.query(
    `INSERT INTO cost_workers (full_name, monthly_salary, department, notes)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.fullName, data.monthlySalary, data.department, data.notes || null]
  );
  return rows[0];
}

export async function updateWorker(id, data) {
  const fields = [];
  const vals = [];
  let i = 1;
  if (data.fullName) { fields.push(`full_name = $${i++}`); vals.push(data.fullName); }
  if (data.monthlySalary != null) { fields.push(`monthly_salary = $${i++}`); vals.push(data.monthlySalary); }
  if (data.department) { fields.push(`department = $${i++}`); vals.push(data.department); }
  if (data.isActive !== undefined) { fields.push(`is_active = $${i++}`); vals.push(data.isActive); }
  if (data.notes !== undefined) { fields.push(`notes = $${i++}`); vals.push(data.notes); }
  if (!fields.length) throw new AppError('Yangilash uchun ma\'lumot yo\'q', 400);
  fields.push('updated_at = NOW()');
  vals.push(id);
  const { rows } = await db.query(
    `UPDATE cost_workers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!rows.length) throw new AppError('Ishchi topilmadi', 404);
  return rows[0];
}

export async function setProductionWorkers(sessionId, workers) {
  await db.query(`DELETE FROM production_session_workers WHERE session_id = $1`, [sessionId]);
  for (const w of workers) {
    await db.query(
      `INSERT INTO production_session_workers (session_id, worker_id, kg_per_minute)
       VALUES ($1,$2,$3) ON CONFLICT (session_id, worker_id) DO UPDATE SET kg_per_minute = $3`,
      [sessionId, w.workerId, w.kgPerMinute]
    );
  }
  const { rows } = await db.query(
    `SELECT w.*, sw.kg_per_minute
     FROM production_session_workers sw
     JOIN cost_workers w ON w.id = sw.worker_id
     WHERE sw.session_id = $1`,
    [sessionId]
  );
  return rows;
}

export async function getProductionWorkers(sessionId) {
  const { rows } = await db.query(
    `SELECT w.id, w.full_name, w.monthly_salary, w.department, sw.kg_per_minute
     FROM production_session_workers sw
     JOIN cost_workers w ON w.id = sw.worker_id
     WHERE sw.session_id = $1`,
    [sessionId]
  );
  return rows;
}

export async function setCuttingWorkers(sessionId, workers) {
  await db.query(`DELETE FROM cutting_session_workers WHERE session_id = $1`, [sessionId]);
  for (const w of workers) {
    await db.query(
      `INSERT INTO cutting_session_workers (session_id, worker_id, kg_per_minute)
       VALUES ($1,$2,$3) ON CONFLICT (session_id, worker_id) DO UPDATE SET kg_per_minute = $3`,
      [sessionId, w.workerId, w.kgPerMinute]
    );
  }
  const { rows } = await db.query(
    `SELECT w.*, sw.kg_per_minute
     FROM cutting_session_workers sw
     JOIN cost_workers w ON w.id = sw.worker_id
     WHERE sw.session_id = $1`,
    [sessionId]
  );
  return rows;
}

export async function getCuttingWorkers(sessionId) {
  const { rows } = await db.query(
    `SELECT w.id, w.full_name, w.monthly_salary, w.department, sw.kg_per_minute
     FROM cutting_session_workers sw
     JOIN cost_workers w ON w.id = sw.worker_id
     WHERE sw.session_id = $1`,
    [sessionId]
  );
  return rows;
}
