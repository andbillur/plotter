import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './scrap.service.js';

export const scrapRouter = Router();
scrapRouter.use(auth);

scrapRouter.get('/stock', checkPermission('scrap:read'), asyncHandler(async (_req, res) => {
  res.json(await svc.listStock());
}));

scrapRouter.get('/transactions', checkPermission('scrap:read'), asyncHandler(async (req, res) => {
  res.json(await svc.listTransactions(req.query));
}));

const movementBody = z.object({
  warehouseType: z.enum(['brak', 'makulatura']),
  movementType: z.enum([
    'kirim',
    'kirim_savdo',
    'chiqim',
    'chiqim_sotish',
    'chiqim_ishlatish',
  ]),
  quantityKg: z.number().positive(),
  pricePerKg: z.number().nonnegative().optional(),
  totalAmount: z.number().optional(),
  counterparty: z.string().optional(),
  notes: z.string().optional(),
  qrCode: z.string().optional(),
  createLabel: z.boolean().optional(),
});

scrapRouter.get('/lots/:qrCode', checkPermission('scrap:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getLotByQr(req.params.qrCode));
}));

scrapRouter.post('/movements', checkPermission('scrap:manage'), validate(z.object({ body: movementBody })), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.addMovement(req.validated.body, req.user.id));
}));

scrapRouter.get('/cutting/:sessionId/waste-status', checkPermission('scrap:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getCuttingWasteStatus(req.params.sessionId));
}));

scrapRouter.post(
  '/cutting/:sessionId/allocate',
  checkPermission('scrap:manage'),
  validate(z.object({
    body: z.object({
      brakKg: z.number().nonnegative(),
      makulaturaKg: z.number().nonnegative(),
    }),
  })),
  asyncHandler(async (req, res) => {
    res.json(await svc.allocateCuttingWaste(req.params.sessionId, req.validated.body, req.user.id));
  })
);
