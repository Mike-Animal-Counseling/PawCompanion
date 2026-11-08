import { createHash } from 'node:crypto';
import helmet from 'helmet';
import { createClient } from 'redis';
import { logger } from './lib/logger.js';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
});

/**
 * Shared request budgets. Production deployments should point REDIS_URL at a
 * managed Redis instance so limits are shared across instances. Without Redis
 * the limiter is per-process (fine for a single-instance demo).
 */
export async function createBudgets(env = process.env) {
  let client;
  const memory = new Map();

  if (env.REDIS_URL) {
    if (env.NODE_ENV === 'production' && !env.REDIS_URL.startsWith('rediss://')) {
      throw new Error('REDIS_URL must use TLS (rediss://) in production');
    }
    client = createClient({
      disableOfflineQueue: true,
      commandsQueueMaxLength: 500,
      commandOptions: { timeout: 5000 },
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => (retries > 2 ? new Error('Redis unavailable') : 100),
      },
    });
    client.on('error', () => {});
    await client.connect();
  } else if (env.NODE_ENV === 'production') {
    logger.warn('rate_limit.memory_fallback', {
      message: 'REDIS_URL is not configured; rate limits are per-instance.',
    });
  }

  const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; return n";

  return {
    async take(key, limit, windowMs) {
      const id = `paw:budget:${createHash('sha256').update(key).digest('hex')}`;
      if (client) {
        if (!client.isReady) throw new Error('Budget unavailable');
        return Number(await client.eval(script, { keys: [id], arguments: [String(windowMs)] })) <= limit;
      }
      const now = Date.now();
      if (memory.size > 2000) {
        for (const [k, v] of memory) if (v.until <= now) memory.delete(k);
      }
      if (!memory.has(id) && memory.size >= 10000) return false;
      const bucket = memory.get(id) || { count: 0, until: now + windowMs };
      bucket.count += 1;
      memory.set(id, bucket);
      return bucket.count <= limit;
    },
    async close() {
      if (client?.isOpen) await client.quit();
    },
  };
}

export function rateLimit(budgets, namespace, limit, windowMs = 60_000, identify = (req) => req.ip) {
  return async (req, res, next) => {
    try {
      const allowed = await budgets.take(`${namespace}:${identify(req)}`, limit, windowMs);
      if (!allowed) {
        res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
        return res.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
          requestId: req.id,
        });
      }
      next();
    } catch {
      res.status(503).json({
        error: { code: 'UNAVAILABLE', message: 'Service temporarily unavailable' },
        requestId: req.id,
      });
    }
  };
}
