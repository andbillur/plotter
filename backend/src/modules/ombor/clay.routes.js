import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission, checkSuperAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './clay.service.js';

export const clayRouter = Router();
clayRouter.use(auth);

clayRouter.get('/balance', checkPermission('clay:read'), asyncHandler(async (_req, res) => {
  res.json(await svc.getBalance());
}));

clayRouter.post('/receive', checkSuperAdmin, validate(z.object({
  body: z.object({
    quantityBags: z.number().int().positive().optional(),
    quantityKg: z.number().positive().optional(),
    notes: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.receive(req.validated.body, req.user.id));
}));

clayRouter.get('/transactions', checkPermission('clay:read'), asyncHandler(async (req, res) => {
  res.json(await svc.listTransactions(req.query));
}));

clayRouter.delete('/transactions/:id', checkSuperAdmin, asyncHandler(async (req, res) => {
  res.json(await svc.removeTransaction(req.params.id));
}));
