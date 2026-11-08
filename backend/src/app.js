import express from 'express';
import cors from 'cors';
import path from 'node:path';
import mongoose from 'mongoose';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { securityHeaders, rateLimit } from './security.js';
import { requestContext } from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import authRouter from './routers/auth.router.js';
import animalRouter from './routers/animal.router.js';
import favoriteRouter from './routers/favorite.router.js';
import bookingRouter from './routers/booking.router.js';
import checkinRouter from './routers/checkin.router.js';
import meRouter from './routers/me.router.js';
import notificationRouter from './routers/notification.router.js';
import aiRouter from './routers/ai.router.js';
import merchantRouter from './routers/merchant.router.js';
import adminRouter from './routers/admin.router.js';

const noopBudgets = { take: async () => true, close: async () => {} };

export function createApp({ config, budgets = noopBudgets }) {
  const app = express();
  app.locals.config = config;
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(requestContext);
  app.use(securityHeaders);

  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (config.production && !req.secure && req.path !== '/api/health') {
      return res.status(426).json({
        error: { code: 'HTTPS_REQUIRED', message: 'HTTPS is required' },
        requestId: req.id,
      });
    }
    const origin = req.get('Origin');
    if (origin && !config.corsOrigins.includes(origin)) {
      return res.status(403).json({
        error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origin not allowed' },
        requestId: req.id,
      });
    }
    next();
  });

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'Retry-After'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '32kb', strict: true }));

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, service: 'pawcompanion-api', uptime: Math.round(process.uptime()) }),
  );

  app.get('/api/ready', async (_req, res) => {
    const database = mongoose.connection.readyState === 1;
    let limits = true;
    try {
      limits = typeof budgets.take === 'function';
    } catch {
      limits = false;
    }
    const ready = database && limits;
    res.status(ready ? 200 : 503).json({
      ok: ready,
      checks: { database, budgets: limits },
    });
  });

  app.get('/api', (_req, res) =>
    res.json({
      name: 'PawCompanion API',
      version: '2.0.0',
      docs: '/api/health',
    }),
  );

  // Coarse per-process protection; the Redis/memory budgets below provide
  // per-identity limits and are shared when Redis is configured.
  app.use(expressRateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(rateLimit(budgets, 'ip', 300, 60_000));

  // Refresh and session checks are part of normal page loads. Only credential
  // entry and registration get the tight per-account budget.
  const credentialLimiter = rateLimit(
    budgets,
    'auth-account',
    10,
    15 * 60_000,
    (req) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : req.ip),
  );
  app.use(
    '/api/auth',
    rateLimit(budgets, 'auth-ip', 120, 15 * 60_000),
    (req, res, next) => {
      if (!/^\/(customer|merchant|admin)\/(login|register)$/.test(req.path)) return next();
      return credentialLimiter(req, res, next);
    },
    authRouter,
  );

  app.use('/api/animals', animalRouter);
  app.use('/api/favorites', requireAuth, requireRole('customer'), favoriteRouter);
  app.use('/api/bookings', bookingRouter);
  app.use('/api/notifications', notificationRouter);
  app.use(
    '/api/checkins',
    requireAuth,
    requireRole('customer'),
    rateLimit(budgets, 'checkin-user', 40, 3_600_000, (req) => req.auth.sub),
    checkinRouter,
  );
  app.use('/api/me', meRouter);

  app.use(
    '/api/ai',
    requireAuth,
    requireRole('customer'),
    (req, res, next) => {
      if (req.method !== 'POST' || req.path !== '/chat') return next();
      if (config.production && !config.ai.enabled) {
        return res.status(503).json({
          error: { code: 'AI_DISABLED', message: 'Companion chat is temporarily unavailable' },
          requestId: req.id,
        });
      }
      return rateLimit(budgets, 'chat-user', 30, 3_600_000, (request) => request.auth.sub)(req, res, () =>
        rateLimit(budgets, 'chat-global', 400, 3_600_000, () => 'all')(req, res, next),
      );
    },
    aiRouter,
  );

  app.use(
    '/api/merchant',
    requireAuth,
    requireRole('merchant'),
    rateLimit(budgets, 'merchant', 240, 60_000, (req) => req.auth.sub),
    (req, res, next) => {
      if (req.method === 'POST' && req.path === '/uploads') {
        return rateLimit(budgets, 'uploads-global', 120, 3_600_000, () => 'all')(req, res, next);
      }
      next();
    },
    merchantRouter,
  );

  app.use(
    '/api/admin',
    requireAuth,
    requireRole('admin'),
    rateLimit(budgets, 'admin', 240, 60_000, (req) => req.auth.sub),
    adminRouter,
  );

  app.use(
    '/uploads',
    (req, res, next) => {
      if (/^[a-f\d]{24}-[a-f\d-]{36}\.jpeg$/i.test(path.basename(req.path))) return next();
      res.sendStatus(404);
    },
    express.static(path.resolve(config.uploadDir), {
      dotfiles: 'deny',
      index: false,
      maxAge: '365d',
      immutable: true,
      setHeaders(res) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      },
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
