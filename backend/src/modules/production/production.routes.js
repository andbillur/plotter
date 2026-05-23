import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './production.service.js';
import * as cw from '../costWorkers/costWorkers.service.js';

export const productionRouter = Router();
productionRouter.use(auth);

productionRouter.get('/workers-pool', checkPermission('cost_config:manage'), asyncHandler(async (_req, res) => {
  res.json(await cw.listWorkers('ishlab_chiqarish'));
}));

productionRouter.get('/sessions/active', checkPermission('production:read'), asyncHandler(async (_req, res) => {
  res.json(await svc.listActive());
}));

productionRouter.get('/sessions', checkPermission('production:read'), asyncHandler(async (req, res) => {
  res.json(await svc.list(req.query));
}));

productionRouter.post('/sessions/start', checkPermission('production:start'), validate(z.object({
  body: z.object({ bobinQrCode: z.string(), machineId: z.string().uuid() }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.start(req.validated.body, req.user.id));
}));

productionRouter.post('/sessions/:id/clay/add', checkPermission('production:clay_add'), validate(z.object({
  body: z.object({
    quantityKg: z.number().positive().optional(),
    bags: z.number().int().positive().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.addClay(req.params.id, req.validated.body, req.user.id));
}));

productionRouter.post('/sessions/:id/finish', checkPermission('production:finish'), validate(z.object({
  body: z.object({
    outputMeters: z.number().positive(),
    bobinRemainingMeters: z.number().nonnegative(),
  }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.finish(req.params.id, req.validated.body, req.user.id));
}));

productionRouter.patch('/sessions/:id/cancel', checkPermission('production:cancel'), asyncHandler(async (req, res) => {
  res.json(await svc.cancel(req.params.id));
}));

productionRouter.post('/admin/recalc-cost-reports', checkPermission('cost_config:manage'), asyncHandler(async (req, res) => {
  const forceAll = req.query.forceAll === 'true' || req.body?.forceAll === true;
  res.json(await svc.recalcInflatedCostReports({ forceAll }));
}));

productionRouter.get('/sessions/:id/cost', checkPermission('production:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getCost(req.params.id));
}));

productionRouter.put('/sessions/:id/workers', checkPermission('cost_config:manage'), validate(z.object({
  body: z.object({
    workers: z.array(z.object({
      workerId: z.string().uuid(),
      metersPerMinute: z.number().positive(),
    })),
  }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.setSessionWorkers(req.params.id, req.validated.body.workers));
}));

productionRouter.get('/sessions/:id', checkPermission('production:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getById(req.params.id));
}));
