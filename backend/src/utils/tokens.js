import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function refreshExpiresAt() {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const match = String(raw).match(/^(\d+)d$/);
  const days = match ? parseInt(match[1], 10) : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
