import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token talab qilinadi' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz yoki muddati tugagan' });
  }
}
