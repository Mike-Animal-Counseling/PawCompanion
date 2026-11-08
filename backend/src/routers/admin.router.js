import { Router } from 'express';
import Animal from '../models/Animal.js';
import AuditEvent from '../models/AuditEvent.js';
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import Merchant from '../models/Merchant.js';
import Review from '../models/Review.js';
import RiskEvent from '../models/RiskEvent.js';
import UserRiskProfile from '../models/UserRiskProfile.js';
import { asyncHandler, notFound } from '../lib/errors.js';
import { ok } from '../lib/http.js';
import { escapeRegex, isObjectId } from '../lib/ids.js';
import { validate } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { platformOverview } from '../services/analyticsService.js';
import { acknowledgeRiskProfile } from '../services/riskScoring.js';
import { setReviewVisibility } from '../services/reviewService.js';
import { recordAudit } from '../services/auditService.js';
import { serializeReview } from '../serializers/review.js';
import {
  adminAnimalParamsSchema,
  adminAnimalsQuerySchema,
  adminMerchantParamsSchema,
  adminMerchantsQuerySchema,
  adminMerchantStatusSchema,
  adminModerateSchema,
  adminOverviewQuerySchema,
  adminReviewParamsSchema,
  adminReviewsQuerySchema,
  adminReviewVisibilitySchema,
  adminRiskActionSchema,
  adminRiskParamsSchema,
  adminRiskQuerySchema,
} from '../validators/admin.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function paginationMeta(page, pageSize, total) {
  return { page, pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize), hasNext: page * pageSize < total };
}

router.get(
  '/overview',
  validate(adminOverviewQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    return ok(res, await platformOverview(req.query.days));
  }),
);

router.get(
  '/risk',
  validate(adminRiskQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status } = req.query;
    const filter = status ? { status } : {};
    const [total, profiles, counts] = await Promise.all([
      UserRiskProfile.countDocuments(filter),
      UserRiskProfile.find(filter)
        .sort({ score30d: -1, lastRiskAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      UserRiskProfile.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const customers = await Customer.find({ _id: { $in: profiles.map((profile) => profile.userId) } })
      .select('name email status createdAt')
      .lean();
    const byId = new Map(customers.map((customer) => [String(customer._id), customer]));
    return ok(
      res,
      profiles.map((profile) => ({
        userId: profile.userId,
        status: profile.status,
        flagReason: profile.flagReason || '',
        score7d: Math.round((profile.score7d || 0) * 10) / 10,
        score30d: Math.round((profile.score30d || 0) * 10) / 10,
        events7d: profile.events7d,
        events30d: profile.events30d,
        maxLevel30d: profile.maxLevel30d,
        lastRiskAt: profile.lastRiskAt,
        lastActiveAt: profile.lastActiveAt,
        acknowledgedAt: profile.acknowledgedAt,
        adminNote: profile.adminNote || '',
        customer: byId.get(profile.userId)
          ? {
              name: byId.get(profile.userId).name,
              email: byId.get(profile.userId).email,
              status: byId.get(profile.userId).status,
            }
          : null,
      })),
      { ...paginationMeta(page, pageSize, total), counts: Object.fromEntries(counts.map((row) => [row._id, row.count])) },
    );
  }),
);

router.get(
  '/risk/:userId/events',
  validate(adminRiskParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const events = await RiskEvent.find({ userId: req.params.userId }).sort({ timestamp: -1 }).limit(30).lean();
    const eventAnimalIds = events.map((event) => event.animalId).filter(isObjectId);
    const animals = await Animal.find({ _id: { $in: eventAnimalIds } }).select('name').lean();
    const names = new Map(animals.map((animal) => [String(animal._id), animal.name]));
    return ok(
      res,
      events.map((event) => ({
        id: String(event._id),
        level: event.level,
        score: event.score,
        source: event.source,
        animalName: names.get(String(event.animalId)) || '',
        timestamp: event.timestamp,
      })),
    );
  }),
);

router.patch(
  '/risk/:userId',
  validate(adminRiskParamsSchema, 'params'),
  validate(adminRiskActionSchema),
  asyncHandler(async (req, res) => {
    const profile = await acknowledgeRiskProfile({
      userId: req.params.userId,
      adminId: req.auth.sub,
      resolve: req.body.action === 'resolve',
      note: req.body.note,
    });
    if (!profile) throw notFound('Risk profile not found');
    await recordAudit(req, {
      action: `risk.${req.body.action}`,
      targetType: 'risk_profile',
      targetId: req.params.userId,
      metadata: { note: req.body.note || '' },
    });
    return ok(res, { userId: profile.userId, status: profile.status, acknowledgedAt: profile.acknowledgedAt });
  }),
);

router.get(
  '/merchants',
  validate(adminMerchantsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, q } = req.query;
    const filter = { ...(status ? { status } : {}), ...(q ? { $or: [{ name: { $regex: escapeRegex(q), $options: 'i' } }, { email: { $regex: escapeRegex(q), $options: 'i' } }] } : {}) };
    const [total, merchants, animalCounts, bookingCounts] = await Promise.all([
      Merchant.countDocuments(filter),
      Merchant.find(filter)
        .select('name email businessType city verified status ratingAverage reviewCount createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Animal.aggregate([{ $group: { _id: '$merchantId', count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: '$merchantId', count: { $sum: 1 }, revenue: { $sum: '$pricing.subtotal' } } }]),
    ]);
    const animals = new Map(animalCounts.map((row) => [String(row._id), row.count]));
    const bookings = new Map(bookingCounts.map((row) => [String(row._id), row]));
    return ok(
      res,
      merchants.map((merchant) => ({
        id: String(merchant._id),
        name: merchant.name,
        email: merchant.email,
        businessType: merchant.businessType,
        city: merchant.city,
        verified: merchant.verified,
        status: merchant.status,
        ratingAverage: merchant.ratingAverage,
        reviewCount: merchant.reviewCount,
        listings: animals.get(String(merchant._id)) || 0,
        bookings: bookings.get(String(merchant._id))?.count || 0,
        revenue: Math.round((bookings.get(String(merchant._id))?.revenue || 0) * 100) / 100,
        createdAt: merchant.createdAt,
      })),
      paginationMeta(page, pageSize, total),
    );
  }),
);

router.patch(
  '/merchants/:merchantId',
  validate(adminMerchantParamsSchema, 'params'),
  validate(adminMerchantStatusSchema),
  asyncHandler(async (req, res) => {
    const merchant = await Merchant.findById(req.params.merchantId);
    if (!merchant) throw notFound('Merchant not found');
    merchant.status = req.body.status;
    await merchant.save();
    if (req.body.status === 'suspended') {
      await Animal.updateMany({ merchantId: merchant._id, visibility: 'public' }, { $set: { visibility: 'private' } });
    }
    await recordAudit(req, {
      action: `merchant.${req.body.status}`,
      targetType: 'merchant',
      targetId: merchant._id,
      metadata: { reason: req.body.reason || '' },
    });
    return ok(res, { id: String(merchant._id), status: merchant.status });
  }),
);

router.get(
  '/animals',
  validate(adminAnimalsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, moderationStatus } = req.query;
    const filter = {
      ...(moderationStatus ? { moderationStatus } : {}),
      ...(q ? { $or: [{ name: { $regex: escapeRegex(q), $options: 'i' } }, { breed: { $regex: escapeRegex(q), $options: 'i' } }] } : {}),
    };
    const [total, animals] = await Promise.all([
      Animal.countDocuments(filter),
      Animal.find(filter)
        .populate('merchantId', 'name email status verified')
        .select('name species breed city price imageUrl isActive visibility moderationStatus moderationNote createdAt merchantId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);
    return ok(
      res,
      animals.map((animal) => ({
        id: String(animal._id),
        name: animal.name,
        species: animal.species,
        breed: animal.breed,
        city: animal.city,
        price: animal.price,
        imageUrl: animal.imageUrl,
        isActive: animal.isActive,
        visibility: animal.visibility,
        moderationStatus: animal.moderationStatus,
        moderationNote: animal.moderationNote,
        merchant: animal.merchantId
          ? { id: String(animal.merchantId._id), name: animal.merchantId.name, email: animal.merchantId.email, status: animal.merchantId.status, verified: animal.merchantId.verified }
          : null,
        createdAt: animal.createdAt,
      })),
      paginationMeta(page, pageSize, total),
    );
  }),
);

router.patch(
  '/animals/:animalId',
  validate(adminAnimalParamsSchema, 'params'),
  validate(adminModerateSchema),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findById(req.params.animalId);
    if (!animal) throw notFound('Companion not found');
    animal.moderationStatus = req.body.moderationStatus;
    animal.moderationNote = req.body.reason || '';
    animal.moderatedBy = req.auth.sub;
    animal.moderatedAt = new Date();
    await animal.save();
    await recordAudit(req, {
      action: `animal.${req.body.moderationStatus}`,
      targetType: 'animal',
      targetId: animal._id,
      metadata: { reason: req.body.reason || '' },
    });
    return ok(res, { id: String(animal._id), moderationStatus: animal.moderationStatus });
  }),
);

router.get(
  '/reviews',
  validate(adminReviewsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status } = req.query;
    const filter = status ? { status } : {};
    const [total, reviews] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .populate('customerId', 'name email avatarColor')
        .populate('animalId', 'name imageUrl')
        .populate('merchantId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);
    return ok(
      res,
      reviews.map((review) => ({
        ...serializeReview(review),
        animal: review.animalId ? { id: String(review.animalId._id), name: review.animalId.name, imageUrl: review.animalId.imageUrl } : null,
        merchant: review.merchantId ? { id: String(review.merchantId._id), name: review.merchantId.name } : null,
        moderationNote: review.moderationNote,
      })),
      paginationMeta(page, pageSize, total),
    );
  }),
);

router.patch(
  '/reviews/:reviewId',
  validate(adminReviewParamsSchema, 'params'),
  validate(adminReviewVisibilitySchema),
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.reviewId);
    if (!review) throw notFound('Review not found');
    review.moderationNote = req.body.reason || '';
    review.moderatedBy = req.auth.sub;
    review.moderatedAt = new Date();
    await review.save();
    const updated = await setReviewVisibility({ reviewId: review._id, status: req.body.status, req });
    return ok(res, { id: String(updated._id), status: updated.status });
  }),
);

router.get(
  '/audit',
  asyncHandler(async (_req, res) => {
    const events = await AuditEvent.find().sort({ createdAt: -1 }).limit(100).lean();
    return ok(
      res,
      events.map((event) => ({
        id: String(event._id),
        actorId: event.actorId,
        actorRole: event.actorRole,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        metadata: event.metadata,
        createdAt: event.createdAt,
      })),
    );
  }),
);

export default router;
