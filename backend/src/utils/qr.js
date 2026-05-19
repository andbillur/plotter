import { randomUUID } from 'crypto';

export function generateQrCode(prefix = 'QR') {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
}
