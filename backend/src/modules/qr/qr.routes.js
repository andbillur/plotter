import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './qr.service.js';

export const qrRouter = Router();
qrRouter.use(auth);

qrRouter.get('/scan/:qrCode', asyncHandler(async (req, res) => {
  res.json(await svc.scan(req.params.qrCode, req.user.role));
}));
