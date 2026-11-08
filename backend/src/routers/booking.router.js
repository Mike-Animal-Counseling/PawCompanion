import { Router } from 'express';
import Animal from '../models/Animal.js';
import Review from '../models/Review.js';
import { asyncHandler, conflict, notFound } from '../lib/errors.js';
import { created, ok } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { serializeBooking } from '../serializers/booking.js';
import { serializeReview } from '../serializers/review.js';
import { getDayAvailability } from '../services/availabilityService.js';
import {
  cancelBooking,
  createBooking,
  getBookingForCustomer,
  listCustomerBookings,
  rescheduleBooking,
  sweepPastBookings,
} from '../services/bookingService.js';
import { createReview } from '../services/reviewService.js';
import { calculatePricing, servicesForAnimal } from '../services/scheduling.js';
import { notify } from '../services/notificationService.js';
import { animalParamsSchema, availabilityQuerySchema, reviewCreateSchema } from '../validators/animal.js';
import {
  bookingCreateSchema,
  bookingListQuerySchema,
  bookingParamsSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  serviceQuoteQuerySchema,
} from '../validators/booking.js';

const router = Router();
const PUBLIC_FILTER = { isActive: true, visibility: 'public', moderationStatus: 'visible' };

router.get(
  '/availability/:animalId',
  validate(animalParamsSchema, 'params'),
  validate(availabilityQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findOne({ _id: req.params.animalId, ...PUBLIC_FILTER }).select('_id').lean();
    if (!animal) throw notFound('Companion not found');
    return ok(res, await getDayAvailability(animal._id, req.query.date));
  }),
);

router.get(
  '/services/:animalId',
  validate(animalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findOne({ _id: req.params.animalId, ...PUBLIC_FILTER }).select('price').lean();
    if (!animal) throw notFound('Companion not found');
    return ok(res, servicesForAnimal(animal.price));
  }),
);

router.get(
  '/quote/:animalId',
  validate(animalParamsSchema, 'params'),
  validate(serviceQuoteQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findOne({ _id: req.params.animalId, ...PUBLIC_FILTER }).select('price').lean();
    if (!animal) throw notFound('Companion not found');
    return ok(res, calculatePricing(animal.price, req.query.service));
  }),
);

router.use(requireAuth, requireRole('customer'));

router.post(
  '/',
  validate(bookingCreateSchema),
  asyncHandler(async (req, res) => {
    const booking = await createBooking({ customer: req.account, input: req.body, req });
    return created(res, serializeBooking(booking));
  }),
);

router.get(
  '/',
  validate(bookingListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    await sweepPastBookings().catch(() => {});
    const { page, pageSize, status } = req.query;
    const { total, items } = await listCustomerBookings({
      customerId: req.auth.sub,
      status,
      page,
      pageSize,
    });
    return ok(res, items.map((booking) => serializeBooking(booking)), {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
    });
  }),
);

router.get(
  '/:bookingId',
  validate(bookingParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForCustomer(req.params.bookingId, req.auth.sub);
    const review = booking.reviewId
      ? await Review.findById(booking.reviewId).populate('customerId', 'name avatarColor').lean()
      : null;
    return ok(res, {
      ...serializeBooking(booking),
      review: review ? serializeReview(review) : null,
    });
  }),
);

router.post(
  '/:bookingId/cancel',
  validate(bookingParamsSchema, 'params'),
  validate(cancelBookingSchema),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForCustomer(req.params.bookingId, req.auth.sub);
    const cancelled = await cancelBooking({
      booking,
      actorRole: 'customer',
      reason: req.body.reason,
      req,
    });
    return ok(res, serializeBooking(cancelled));
  }),
);

router.post(
  '/:bookingId/reschedule',
  validate(bookingParamsSchema, 'params'),
  validate(rescheduleBookingSchema),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForCustomer(req.params.bookingId, req.auth.sub);
    const updated = await rescheduleBooking({
      booking,
      date: req.body.date,
      startTime: req.body.startTime,
      actorRole: 'customer',
      req,
    });
    return ok(res, serializeBooking(updated));
  }),
);

router.post(
  '/:bookingId/review',
  validate(bookingParamsSchema, 'params'),
  validate(reviewCreateSchema),
  asyncHandler(async (req, res) => {
    const existingBooking = await getBookingForCustomer(req.params.bookingId, req.auth.sub);
    const review = await createReview({
      bookingId: existingBooking._id,
      customerId: req.auth.sub,
      input: req.body,
      req,
    });
    const populated = await Review.findById(review._id).populate('customerId', 'name avatarColor').lean();
    await notify({
      recipientId: existingBooking.merchantId._id,
      recipientRole: 'merchant',
      type: 'review_received',
      title: 'New guest review',
      body: `${req.account.name} rated ${existingBooking.animalSnapshot.name} ${review.rating}/5.`,
      link: '/merchant/reviews',
      data: { reviewId: String(review._id) },
    });
    return created(res, serializeReview(populated));
  }),
);

router.get(
  '/:bookingId/review',
  validate(bookingParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForCustomer(req.params.bookingId, req.auth.sub);
    if (!booking.reviewId) throw notFound('No review for this visit');
    const review = await Review.findById(booking.reviewId).populate('customerId', 'name avatarColor').lean();
    if (!review) throw conflict('Review is no longer available');
    return ok(res, serializeReview(review));
  }),
);

export default router;
