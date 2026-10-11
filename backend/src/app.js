import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { loadSecurity, securityHeaders, rateLimit } from './security.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import animalRouter from './routers/animal.router.js';
import aiRouter from './routers/ai.router.js';
import bookingRouter from './routers/booking.router.js';
import merchantRouter from './routers/merchant.router.js';
import authRouter from './routers/auth.router.js';
import customerRouter from './routers/customer-auth.router.js';
import paymentRouter from './routers/payment.router.js';
export function createApp({ budgets, config = loadSecurity() }) {
  const app = express();
  app.disable('x-powered-by'); app.set('trust proxy', config.trustProxy); app.use(securityHeaders);
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (config.production && !req.secure && req.path !== '/api/health') return res.status(426).json({ error: 'HTTPS required' });
    const origin = req.get('Origin');
    if (origin && !config.origins.includes(origin)) return res.status(403).json({ error: 'Origin not allowed' }); next();
  });
  app.use(cors({ origin: config.origins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Authorization', 'Content-Type'] }));
  app.use(rateLimit(budgets, 'ip', 120)); app.use(express.json({ limit: '16kb', strict: true }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', rateLimit(budgets, 'auth-ip', 10, 900000), rateLimit(budgets, 'auth-account', 10, 900000, req => typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : req.ip));
  app.use('/api/auth/customer', customerRouter); app.use('/api/auth', authRouter);
  app.use('/api/animals', animalRouter);
  app.use('/api/ai', requireAuth, requireRole('customer'), (req, res, next) => {
    if (req.method !== 'POST' || req.path !== '/chat') return next();
    if (config.production && (process.env.ENABLE_AI !== 'true' || !process.env.HUGGINGFACE_API_KEY)) return res.status(503).json({ error: 'Chat is temporarily unavailable' });
    rateLimit(budgets, 'chat-user', 20, 3600000, req => req.auth.sub)(req, res, () => rateLimit(budgets, 'chat-global', 200, 3600000, () => 'all')(req, res, next));
  }, aiRouter);
  app.use('/api/booking', bookingRouter);
  app.use('/api/merchant', requireAuth, requireRole('merchant'), rateLimit(budgets, 'merchant', 60, 60000, req => req.auth.sub), (req, res, next) => req.method === 'POST' && req.path === '/upload-image' ? rateLimit(budgets, 'uploads-global', 100, 3600000, () => 'all')(req, res, next) : next(), merchantRouter);
  // There is no live payment provider integration in this repository. Never
  // expose simulated settlement/refund or public notification delivery in production.
  app.use('/api/payment', requireAuth, requireRole('customer'), (req, res, next) => config.production ? res.status(503).json({ error: 'Payment service is temporarily unavailable' }) : next(), paymentRouter);
  app.use('/api/notification', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/uploads', (req, res, next) => /^[a-f\d]{24}-[a-f\d-]{36}\.jpeg$/i.test(path.basename(req.path)) ? next() : res.sendStatus(404), express.static(path.resolve('uploads'), { dotfiles: 'deny', index: false, setHeaders(res) { res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox"); } }));
  app.use((error, _req, res, _next) => res.status(error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500).json({ error: 'Request could not be processed' }));
  return app;
}
