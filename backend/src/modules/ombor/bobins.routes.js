import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission, checkSuperAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './bobins.service.js';

export const bobinsRouter = Router();
bobinsRouter.use(auth);

bobinsRouter.get('/stock/summary', checkPermission('bobin:read'), asyncHandler(async (_req, res) => {
  res.json(await svc.stockSummary());
}));

bobinsRouter.get('/qr/:qrCode', checkPermission('bobin:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getByQr(req.params.qrCode));
}));

bobinsRouter.get('/', checkPermission('bobin:read'), asyncHandler(async (req, res) => {
  res.json(await svc.list(req.query));
}));

bobinsRouter.post('/', checkPermission('bobin:create'), validate(z.object({
  body: z.object({
    qrCode: z.string().optional(),
    grammaj: z.number().positive(),
    color: z.string().optional(),
    initialWeightKg: z.number().positive(),
    initialLengthM: z.number().positive(),
    widthMm: z.number().optional(),
    supplierName: z.string().optional(),
    batchNumber: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.create(req.validated.body, req.user.id));
}));

bobinsRouter.get('/:id', checkPermission('bobin:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getById(req.params.id));
}));

bobinsRouter.patch('/:id', checkPermission('bobin:update'), validate(z.object({
  body: z.object({
    color: z.string().optional(),
    currentWeightKg: z.number().optional(),
    currentLengthM: z.number().optional(),
    status: z.enum(['omborxonada', 'mashinada', 'ishlatilgan', 'qaytarilgan']).optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.update(req.params.id, req.validated.body));
}));

bobinsRouter.delete('/:id', checkSuperAdmin, asyncHandler(async (req, res) => {
  res.json(await svc.remove(req.params.id));
}));
