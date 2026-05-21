import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission, checkSuperAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './warehouse.service.js';

export const warehouseRouter = Router();
warehouseRouter.use(auth);

warehouseRouter.get('/summary', checkPermission('warehouse:read'), asyncHandler(async (_req, res) => {
  res.json(await svc.getSummary());
}));

warehouseRouter.get('/products', checkPermission('warehouse:read'), asyncHandler(async (req, res) => {
  res.json(await svc.listStock(req.query));
}));

warehouseRouter.post('/products', checkPermission('warehouse:manage'), validate(z.object({
  body: z.object({
    qrCode: z.string().optional(),
    cutProductId: z.string().uuid().optional(),
    widthCm: z.number().positive().optional(),
    weightKg: z.number().positive().optional(),
    lengthM: z.number().optional(),
    color: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.registerProduct(req.validated.body, req.user.id));
}));

warehouseRouter.post('/products/scan', checkPermission('warehouse:manage'), validate(z.object({
  body: z.object({ qrCode: z.string(), color: z.string().optional() }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.registerFromQr(req.validated.body.qrCode, req.validated.body));
}));

warehouseRouter.delete('/products/:id', checkSuperAdmin, asyncHandler(async (req, res) => {
  res.json(await svc.removeProduct(req.params.id));
}));
