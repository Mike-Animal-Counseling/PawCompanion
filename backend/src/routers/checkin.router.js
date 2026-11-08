import { Router } from 'express';
import { asyncHandler, notFound } from '../lib/errors.js';
import { created, ok } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { checkinHistory, deleteCheckin, todayCheckin, upsertCheckin } from '../services/checkinService.js';
import { checkinCreateSchema, checkinHistoryQuerySchema, checkinParamsSchema } from '../validators/checkin.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

router.get(
  '/today',
  asyncHandler(async (req, res) => ok(res, { checkin: await todayCheckin(req.auth.sub) })),
);

router.get(
  '/',
  validate(checkinHistoryQuerySchema, 'query'),
  asyncHandler(async (req, res) => ok(res, await checkinHistory({ customerId: req.auth.sub, days: req.query.days }))),
);

router.post(
  '/',
  validate(checkinCreateSchema),
  asyncHandler(async (req, res) => {
    const result = await upsertCheckin({
      customer: req.account,
      input: req.body,
      config: req.app.locals.config,
    });
    return created(res, result);
  }),
);

router.delete(
  '/:checkinId',
  validate(checkinParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await deleteCheckin({ customerId: req.auth.sub, id: req.params.checkinId });
    if (!result.deletedCount) throw notFound('Check-in not found');
    return ok(res, { deleted: true });
  }),
);

export default router;
