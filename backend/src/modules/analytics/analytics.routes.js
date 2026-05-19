import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './analytics.service.js';

export const analyticsRouter = Router();
analyticsRouter.use(auth);

analyticsRouter.get('/dashboard', checkPermission('analytics:dashboard'), asyncHandler(async (_req, res) => {
  res.json(await svc.dashboard());
}));

analyticsRouter.get('/production', checkPermission('production:read'), asyncHandler(async (req, res) => {
  res.json(await svc.productionStats(req.query));
}));

analyticsRouter.get('/cost-report', checkPermission('analytics:cost'), asyncHandler(async (req, res) => {
  res.json(await svc.costReport(req.query));
}));

analyticsRouter.get('/waste-report', checkPermission('analytics:waste'), asyncHandler(async (req, res) => {
  res.json(await svc.wasteReport(req.query));
}));

analyticsRouter.get('/clay-consumption', checkPermission('analytics:cost'), asyncHandler(async (req, res) => {
  res.json(await svc.clayConsumption(req.query));
}));

analyticsRouter.get('/inventory', checkPermission('analytics:dashboard'), asyncHandler(async (_req, res) => {
  res.json(await svc.inventory());
}));

analyticsRouter.get('/cost-config/current', checkPermission('analytics:cost'), asyncHandler(async (_req, res) => {
  res.json(await svc.currentCostConfig());
}));

analyticsRouter.post('/cost-config', checkPermission('cost_config:manage'), validate(z.object({
  body: z.object({
    paperPricePerKg: z.number().positive(),
    clayPricePerKg: z.number().positive(),
    electricityCostPerKg: z.number().optional(),
    laborCostPerKg: z.number().optional(),
    otherCostPerKg: z.number().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.upsertCostConfig(req.validated.body, req.user.id));
}));

analyticsRouter.get('/audit-logs', checkPermission('audit:read'), asyncHandler(async (req, res) => {
  res.json(await svc.auditLogs(req.query));
}));
