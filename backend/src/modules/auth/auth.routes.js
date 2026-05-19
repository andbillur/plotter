import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';

export const authRouter = Router();

const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
});

const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1) }),
});

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(
      req.validated.body.username,
      req.validated.body.password,
      { ip: req.ip, userAgent: req.get('user-agent') }
    );
    res.json(result);
  })
);

authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.validated.body.refreshToken);
    res.json(result);
  })
);

authRouter.post(
  '/logout',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    await authService.logout(req.validated.body.refreshToken);
    res.json({ ok: true });
  })
);

authRouter.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    res.json(user);
  })
);
