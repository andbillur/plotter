import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission, checkSuperAdmin } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './costWorkers.service.js';

export const costWorkersRouter = Router();
costWorkersRouter.use(auth);

costWorkersRouter.get('/', checkPermission('cost_config:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.listAllWorkers());
}));

costWorkersRouter.post('/', checkPermission('cost_config:manage'), validate(z.object({
  body: z.object({
    fullName: z.string().min(2),
    monthlySalary: z.number().positive(),
    department: z.enum(['ishlab_chiqarish', 'kesish', 'qadoqlash']),
    notes: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.createWorker(req.validated.body));
}));

costWorkersRouter.patch('/:id', checkPermission('cost_config:manage'), validate(z.object({
  body: z.object({
    fullName: z.string().optional(),
    monthlySalary: z.number().positive().optional(),
    department: z.enum(['ishlab_chiqarish', 'kesish', 'qadoqlash']).optional(),
    isActive: z.boolean().optional(),
    notes: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.updateWorker(req.params.id, req.validated.body));
}));
