import { randomUUID } from 'node:crypto';
import { logger } from '../lib/logger.js';

export function requestContext(req, res, next) {
  const incoming = req.get('x-request-id');
  req.id = /^[\w-]{8,64}$/.test(incoming || '') ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const startedAt = process.hrtime.bigint();
  // Capture the path now: Express rewrites req.path while traversing mounted
  // routers, so reading it in the finish handler would lose the /api prefix.
  const path = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const fields = {
      requestId: req.id,
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
    };
    if (res.statusCode >= 500) logger.error('http.request', fields);
    else if (res.statusCode >= 400) logger.warn('http.request', fields);
    else logger.info('http.request', fields);
  });

  next();
}
