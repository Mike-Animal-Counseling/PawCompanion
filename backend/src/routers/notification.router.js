import { Router } from 'express';
import { asyncHandler, notFound } from '../lib/errors.js';
import { ok } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import { serializeNotification } from '../serializers/notification.js';
import { markAllRead, markRead, unreadCount } from '../services/notificationService.js';
import { z } from 'zod';
import { pagination } from '../validators/common.js';

const router = Router();
router.use(requireAuth);

const listQuerySchema = z.object({
  page: pagination.page,
  pageSize: pagination.pageSize,
  unreadOnly: z.preprocess((value) => value === 'true', z.boolean()).optional(),
});

const idSchema = z.object({ notificationId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid notification') });

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, unreadOnly } = req.query;
    const filter = { recipientId: req.auth.sub, recipientRole: req.auth.role, ...(unreadOnly ? { readAt: null } : {}) };
    const [total, items, unread] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      unreadCount(req.auth.sub, req.auth.role),
    ]);
    return ok(res, items.map(serializeNotification), {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      unread,
    });
  }),
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    return ok(res, { unread: await unreadCount(req.auth.sub, req.auth.role) });
  }),
);

router.post(
  '/:notificationId/read',
  validate(idSchema, 'params'),
  asyncHandler(async (req, res) => {
    const notification = await markRead(req.auth.sub, req.auth.role, req.params.notificationId);
    if (!notification) throw notFound('Notification not found');
    return ok(res, serializeNotification(notification));
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const updated = await markAllRead(req.auth.sub, req.auth.role);
    return ok(res, { updated });
  }),
);

export default router;
