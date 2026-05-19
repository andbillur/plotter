import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './shipments.service.js';

export const shipmentsRouter = Router();
shipmentsRouter.use(auth);

shipmentsRouter.get('/', checkPermission('shipment:read'), asyncHandler(async (req, res) => {
  res.json(await svc.list(req.query));
}));

shipmentsRouter.post('/', checkPermission('shipment:manage'), validate(z.object({
  body: z.object({
    destination: z.string().optional(),
    customerName: z.string().optional(),
    notes: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.create(req.validated.body, req.user.id));
}));

shipmentsRouter.get('/:id', checkPermission('shipment:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getById(req.params.id));
}));

shipmentsRouter.post('/:id/scan', checkPermission('shipment:manage'), validate(z.object({
  body: z.object({ qrCode: z.string().min(1) }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.addByQr(req.params.id, req.validated.body.qrCode));
}));

shipmentsRouter.delete('/:id/items/:itemId', checkPermission('shipment:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.removeItem(req.params.id, req.params.itemId));
}));

shipmentsRouter.post('/:id/finish', checkPermission('shipment:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.finish(req.params.id));
}));
