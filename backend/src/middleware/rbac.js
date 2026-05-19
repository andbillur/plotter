import { db } from '../config/database.js';

export function checkPermission(permissionCode) {
  return async (req, res, next) => {
    const result = await db.query(
      `SELECT p.code
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = $1 AND p.code = $2 AND u.is_active = true`,
      [req.user.id, permissionCode]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Ruxsat yo\'q',
        required: permissionCode,
      });
    }
    next();
  };
}
