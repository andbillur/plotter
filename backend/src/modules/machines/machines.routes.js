import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './machines.service.js';

export const machinesRouter = Router();
machinesRouter.use(auth);

machinesRouter.get('/', asyncHandler(async (_req, res) => {
  res.json(await svc.list());
}));

machinesRouter.post('/', checkPermission('users:manage'), validate(z.object({
  body: z.object({
    name: z.string(),
    machineType: z.enum(['production', 'cutting']),
    description: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.create(req.validated.body));
}));

machinesRouter.get('/:id/status', asyncHandler(async (req, res) => {
  res.json(await svc.getStatus(req.params.id));
}));
