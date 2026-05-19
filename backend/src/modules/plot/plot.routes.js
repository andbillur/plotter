import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './plot.service.js';

export const plotRouter = Router();
plotRouter.use(auth);

plotRouter.get('/active', checkPermission('plot:read'), asyncHandler(async (_req, res) => {
  res.json(await svc.getActive());
}));

plotRouter.get('/', checkPermission('plot:read'), asyncHandler(async (req, res) => {
  res.json(await svc.list(req.query));
}));

plotRouter.post('/', checkPermission('plot:manage'), validate(z.object({
  body: z.object({ widthCm: z.number().positive() }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.create(req.validated.body, req.user.id));
}));

plotRouter.get('/:id/summary', checkPermission('plot:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getSummary(req.params.id));
}));

plotRouter.get('/:id', checkPermission('plot:read'), asyncHandler(async (req, res) => {
  res.json(await svc.getById(req.params.id));
}));

plotRouter.post('/:id/items/add', checkPermission('plot:manage'), validate(z.object({
  body: z.object({ cutProductId: z.string().uuid() }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.addItem(req.params.id, req.validated.body.cutProductId));
}));

plotRouter.delete('/:id/items/:cutProductId', checkPermission('plot:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.removeItem(req.params.id, req.params.cutProductId));
}));

plotRouter.post('/:id/close', checkPermission('plot:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.close(req.params.id, req.user.id));
}));
