import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { checkPermission } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as svc from './users.service.js';

export const usersRouter = Router();
usersRouter.use(auth);

usersRouter.get('/roles', checkPermission('users:manage'), asyncHandler(async (_req, res) => {
  res.json(await svc.listRoles());
}));

usersRouter.get('/', checkPermission('users:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.list(req.query));
}));

usersRouter.post('/', checkPermission('users:manage'), validate(z.object({
  body: z.object({
    fullName: z.string().min(2),
    username: z.string().min(3),
    password: z.string().min(6),
    roleName: z.enum(['super_admin', 'omborchi', 'mashina_operatori', 'kesuvchi_ishchi', 'direktor']),
    phone: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.create(req.validated.body));
}));

usersRouter.get('/:id', checkPermission('users:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.getById(req.params.id));
}));

usersRouter.patch('/:id', checkPermission('users:manage'), validate(z.object({
  body: z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    roleName: z.string().optional(),
  }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.update(req.params.id, req.validated.body));
}));

usersRouter.delete('/:id', checkPermission('users:manage'), asyncHandler(async (req, res) => {
  res.json(await svc.softDelete(req.params.id));
}));

usersRouter.patch('/:id/password', checkPermission('users:manage'), validate(z.object({
  body: z.object({ password: z.string().min(6) }),
})), asyncHandler(async (req, res) => {
  res.json(await svc.changePassword(req.params.id, req.validated.body.password));
}));
