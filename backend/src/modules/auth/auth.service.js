import bcrypt from 'bcrypt';
import { db } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { signAccessToken, generateRefreshToken, refreshExpiresAt } from '../../utils/tokens.js';

export async function login(username, password, meta = {}) {
  const { rows } = await db.query(
    `SELECT u.*, r.name AS role_name, r.display_name AS role_display
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.username = $1 AND u.is_active = true`,
    [username]
  );
  if (rows.length === 0) throw new AppError('Login yoki parol noto\'g\'ri', 401);

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new AppError('Login yoki parol noto\'g\'ri', 401);

  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = refreshExpiresAt();

  await db.query(
    `INSERT INTO user_sessions (user_id, refresh_token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, refreshToken, meta.ip, meta.userAgent, expiresAt]
  );

  await db.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

  return {
    accessToken,
    refreshToken,
    expiresAt,
    user: sanitizeUser(user),
  };
}

export async function refresh(refreshToken) {
  const { rows } = await db.query(
    `SELECT us.*, u.*, r.name AS role_name
     FROM user_sessions us
     JOIN users u ON u.id = us.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE us.refresh_token = $1 AND us.expires_at > NOW() AND u.is_active = true`,
    [refreshToken]
  );
  if (rows.length === 0) throw new AppError('Refresh token yaroqsiz', 401);

  const row = rows[0];
  const accessToken = signAccessToken(row);
  return { accessToken, user: sanitizeUser(row) };
}

export async function logout(refreshToken) {
  await db.query(`DELETE FROM user_sessions WHERE refresh_token = $1`, [refreshToken]);
}

export async function getMe(userId) {
  const { rows } = await db.query(
    `SELECT u.id, u.full_name, u.username, u.phone, u.is_active, u.last_login_at,
            r.name AS role_name, r.display_name AS role_display
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );
  if (rows.length === 0) throw new AppError('Foydalanuvchi topilmadi', 404);

  const perms = await db.query(
    `SELECT p.code FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = $1`,
    [userId]
  );

  return { ...rows[0], permissions: perms.rows.map((p) => p.code) };
}

function sanitizeUser(u) {
  return {
    id: u.id,
    fullName: u.full_name,
    username: u.username,
    role: u.role_name,
    roleDisplay: u.role_display,
  };
}
