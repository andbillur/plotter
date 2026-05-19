import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './cutting.service.js';

export const cuttingRouter = Router();
cuttingRouter.use(auth);

cuttingRouter.get('/sessions', checkPermission('cutting:read'), asyncHandler(async (req, res) => {
  res.json(await svc.list(req.query));
}));

cuttingRouter.post('/sessions/start', checkPermission('cutting:manage'), validate(z.object({
  body: z.object({
    parentPaperQrCode: z.string(),
    machineId: z.string().uuid().optional(),
    inputWeightKg: z.number().positive(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.start(req.validated.body, req.user.id));
}));

cuttingRouter.post('/sessions/:id/products/add', checkPermission('cutting:manage'), validate(z.object({
  body: z.object({
    widthCm: z.number().positive(),
    weightKg: z.number().positive(),
    lengthM: z.number().optional(),
    qrCode: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.addProduct(req.params.id, req.validated.body));
}));

cuttingRouter.delete('/sessions/:id/products/:productId', checkPermission('cutting:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.removeProduct(req.params.id, req.params.productId));
}));

cuttingRouter.post('/sessions/:id/finish', checkPermission('cutting:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.finish(req.params.id));
}));

cuttingRouter.get('/sessions/:id/waste-report', checkPermission('cutting:read'), asyncHandler(async (req, res) => {
  res.json(await svc.wasteReport(req.params.id));
}));

cuttingRouter.get('/sessions/:id', checkPermission('cutting:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getById(req.params.id));
}));
