import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './parentPaper.service.js';

export const parentPaperRouter = Router();
parentPaperRouter.use(auth);

parentPaperRouter.get('/available-for-cutting', checkPermission('cutting:read'), asyncHandler(async (_req, res) => {
  res.json(await svc.listAvailableForCutting());
}));

parentPaperRouter.get('/', checkPermission('parent_paper:read'), asyncHandler(async (req, res) => {
  res.json(await svc.list(req.query));
}));

parentPaperRouter.post('/split', checkPermission('parent_paper:create'), validate(z.object({
  body: z.object({
    sessionId: z.string().uuid(),
    children: z.array(z.object({
      weightKg: z.number().positive(),
      qrCode: z.string().optional(),
    })).min(1),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.split(req.validated.body, req.user.id));
}));

parentPaperRouter.get('/qr/:qrCode', checkPermission('parent_paper:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getByQr(req.params.qrCode));
}));

parentPaperRouter.get('/:id/lineage', checkPermission('parent_paper:read'), asyncHandler(async (req, res) => {
  res.json(await svc.lineage(req.params.id));
}));

parentPaperRouter.get('/:id', checkPermission('parent_paper:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getById(req.params.id));
}));
