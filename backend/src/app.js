import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { machinesRouter } from './modules/machines/machines.routes.js';
import { bobinsRouter } from './modules/ombor/bobins.routes.js';
import { clayRouter } from './modules/ombor/clay.routes.js';
import { productionRouter } from './modules/production/production.routes.js';
import { parentPaperRouter } from './modules/parentPaper/parentPaper.routes.js';
import { cuttingRouter } from './modules/cutting/cutting.routes.js';
import { plotRouter } from './modules/plot/plot.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { qrRouter } from './modules/qr/qr.routes.js';
import { AppError } from './utils/errors.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true;

app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'plotter-crm', version: '1.0.0' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/machines', machinesRouter);
app.use('/api/bobins', bobinsRouter);
app.use('/api/clay', clayRouter);
app.use('/api/production', productionRouter);
app.use('/api/parent-papers', parentPaperRouter);
app.use('/api/cutting', cuttingRouter);
app.use('/api/plots', plotRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/qr', qrRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err instanceof AppError ? err.status : err.status || 500;
  res.status(status).json({
    error: err.message || 'Ichki server xatosi',
  });
});

app.listen(port, () => {
  console.log(`Plotter CRM API http://localhost:${port}`);
});
