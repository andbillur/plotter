import { db } from '../config/database.js';

export function auditLog(tableName, action) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode < 400 && req.user?.id) {
        try {
          await db.query(
            `INSERT INTO audit_logs (user_id, table_name, record_id, action, new_values, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.user.id,
              tableName,
              body?.id || body?.data?.id || req.params.id || null,
              action,
              JSON.stringify(body),
              req.ip,
            ]
          );
        } catch (e) {
          console.error('Audit log xatosi:', e.message);
        }
      }
      return originalJson(body);
    };
    next();
  };
}
