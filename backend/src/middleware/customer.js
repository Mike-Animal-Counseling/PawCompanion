import { requireAuth, requireRole } from './auth.js';
export function customerAccess({ publicSlots = false } = {}) {
  return (req, res, next) => {
    if (publicSlots && req.method === 'GET' && req.path.startsWith('/slots/')) return next();
    requireAuth(req, res, () => requireRole('customer')(req, res, () => {
      if (req.query.userId && req.query.userId !== req.auth.sub) return res.status(403).json({ error: 'Access denied' });
      const match = req.path.match(/^\/(?:my|memory|risk-profile)\/([^/]+)/);
      if (match && match[1] !== req.auth.sub) return res.status(403).json({ error: 'Access denied' });
      if (req.body && typeof req.body === 'object') {
        if (Array.isArray(req.body) || (req.body.userId && req.body.userId !== req.auth.sub)) return res.status(403).json({ error: 'Access denied' });
        req.body.userId = req.auth.sub;
        if (req.body.animalId !== undefined && (typeof req.body.animalId !== 'string' || !/^[a-f\d]{24}$/i.test(req.body.animalId))) return res.status(400).json({ error: 'Invalid animal' });
        if (req.body.message !== undefined && typeof req.body.message !== 'string') return res.status(400).json({ error: 'Invalid message' });
        if (typeof req.body.message === 'string' && req.body.message.length > 4000) return res.status(413).json({ error: 'Message too long' });
      }
      if (process.env.NODE_ENV === 'production' && (['/create', '/checkout'].includes(req.path) || req.path.endsWith('/reschedule'))) return res.status(503).json({ error: 'Booking changes are temporarily unavailable' });
      next();
    }));
  };
}
