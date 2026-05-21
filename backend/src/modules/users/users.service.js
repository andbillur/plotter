import bcrypt from 'bcrypt';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';

export async function list(query) {
  const { page, limit, offset, order } = parsePagination(query);
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM users`);
  const { rows } = await db.query(
    `SELECT u.id, u.full_name, u.username, u.phone, u.is_active, u.last_login_at, u.created_at,
            r.name AS role_name, r.display_name AS role_display
     FROM users u JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at ${order}
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return paginatedResponse(rows, count.rows[0].total, { page, limit });
}

export async function getById(id) {
  const { rows } = await db.query(
    `SELECT u.*, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [id]
  );
  if (!rows.length) throw new AppError('Foydalanuvchi topilmadi', 404);
  const { password_hash, ...user } = rows[0];
  return user;
}

export async function create(data) {
  const role = await db.query(`SELECT id FROM roles WHERE name = $1`, [data.roleName]);
  if (!role.rows.length) throw new AppError('Rol topilmadi', 400);
  const hash = await bcrypt.hash(data.password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (full_name, username, password_hash, role_id, phone)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, username, phone, is_active`,
    [data.fullName, data.username, hash, role.rows[0].id, data.phone || null]
  );
  return rows[0];
}

export async function update(id, data) {
  const fields = [];
  const vals = [];
  let i = 1;
  if (data.fullName) { fields.push(`full_name = $${i++}`); vals.push(data.fullName); }
  if (data.phone !== undefined) { fields.push(`phone = $${i++}`); vals.push(data.phone); }
  if (data.roleName) {
    const role = await db.query(`SELECT id FROM roles WHERE name = $1`, [data.roleName]);
    if (!role.rows.length) throw new AppError('Rol topilmadi', 400);
    fields.push(`role_id = $${i++}`);
    vals.push(role.rows[0].id);
  }
  if (data.isActive !== undefined) {
    fields.push(`is_active = $${i++}`);
    vals.push(data.isActive);
  }
  if (!fields.length) throw new AppError('Yangilash uchun ma\'lumot yo\'q', 400);
  fields.push('updated_at = NOW()');
  vals.push(id);
  const { rows } = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, full_name, username, phone, is_active`,
    vals
  );
  if (!rows.length) throw new AppError('Foydalanuvchi topilmadi', 404);
  return rows[0];
}

export async function softDelete(id) {
  const { rows } = await db.query(
    `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id]
  );
  if (!rows.length) throw new AppError('Foydalanuvchi topilmadi', 404);
  return { ok: true };
}

export async function changePassword(id, password) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
    [hash, id]
  );
  if (!rows.length) throw new AppError('Foydalanuvchi topilmadi', 404);
  return { ok: true };
}

export async function listRoles() {
  const roles = await db.query(`SELECT * FROM roles ORDER BY name`);
  const perms = await db.query(`SELECT * FROM permissions ORDER BY module, code`);
  const rp = await db.query(
    `SELECT r.name AS role_name, p.code AS permission_code
     FROM role_permissions rp
     JOIN roles r ON r.id = rp.role_id
     JOIN permissions p ON p.id = rp.permission_id`
  );
  return { roles: roles.rows, permissions: perms.rows, rolePermissions: rp.rows };
}
