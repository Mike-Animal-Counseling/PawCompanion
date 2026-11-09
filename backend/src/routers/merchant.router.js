import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import Animal from '../models/Animal.js';
import AnimalSound from '../models/AnimalSound.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import { AppError, asyncHandler, conflict, notFound } from '../lib/errors.js';
import { created, noContent, ok } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { serializeAnimal } from '../serializers/animal.js';
import { serializeBooking } from '../serializers/booking.js';
import { serializeReview } from '../serializers/review.js';
import { serializeAccount } from '../serializers/account.js';
import { getConfiguredSlots, getBookedStartTimes, saveDayAvailability, availabilityCalendar } from '../services/availabilityService.js';
import {
  acceptBooking,
  completeBooking,
  declineBooking,
  getBookingForMerchant,
  listMerchantBookings,
  rescheduleBooking,
  sweepPastBookings,
} from '../services/bookingService.js';
import { replyToReview } from '../services/reviewService.js';
import { merchantOverview } from '../services/analyticsService.js';
import { storeImage, ownsImage } from '../services/secureImage.js';
import { analyzeAudio, audioExtension, AUDIO_LIMIT_BYTES } from '../services/secureAudio.js';
import { draftDigitalProfile, draftDigitalProfileWithModel } from '../services/digitalProfileDraft.js';
import { hasChatProvider } from '../services/llmProvider.js';
import { recordAudit } from '../services/auditService.js';
import { localDateString } from '../lib/time.js';
import {
  merchantAnimalCreateSchema,
  merchantAnimalParamsSchema,
  merchantAnimalUpdateSchema,
  merchantAvailabilityQuerySchema,
  merchantAvailabilitySchema,
  merchantBookingsQuerySchema,
  merchantNoteSchema,
  merchantOverviewQuerySchema,
  merchantParamsSchema,
  merchantReplySchema,
  merchantRescheduleSchema,
  merchantReviewParamsSchema,
  merchantReviewsQuerySchema,
} from '../validators/merchant.js';
import { updateProfileSchema } from '../validators/auth.js';

const router = Router();
router.use(requireAuth, requireRole('merchant'));

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!IMAGE_TYPES.has(file.mimetype)) return callback(new AppError(400, 'UNSUPPORTED_IMAGE', 'Only JPG and PNG images are supported'));
    callback(null, true);
  },
});

function uploadMiddleware(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (error) {
      return next(
        error instanceof AppError
          ? error
          : new AppError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'UPLOAD_FAILED', error.message || 'Image upload failed'),
      );
    }
    next();
  });
}

function uploadDir(req) {
  return path.resolve(req.app.locals.config.uploadDir);
}

const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac']);
const audio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_LIMIT_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!AUDIO_TYPES.has(file.mimetype)) return callback(new AppError(400, 'UNSUPPORTED_AUDIO', 'Use MP3, OGG, WAV or M4A audio'));
    callback(null, true);
  },
});

function audioMiddleware(req, res, next) {
  audio.single('audio')(req, res, (error) => {
    if (error) {
      return next(
        error instanceof AppError
          ? error
          : new AppError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'AUDIO_UPLOAD_FAILED', error.message || 'Audio upload failed'),
      );
    }
    next();
  });
}

function serializeSound(sound) {
  return {
    id: String(sound._id),
    label: sound.label,
    mood: sound.mood,
    behaviour: sound.behaviour,
    url: sound.url,
    mimeType: sound.mimeType,
    durationMs: sound.durationMs,
    source: sound.source,
    analysis: sound.analysis,
    status: sound.status,
    createdAt: sound.createdAt,
  };
}

async function ensureAnimal(animalId, merchantId) {
  const animal = await Animal.findOne({ _id: animalId, merchantId });
  if (!animal) throw notFound('Listing not found');
  return animal;
}

router.get(
  '/overview',
  validate(merchantOverviewQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    await sweepPastBookings().catch(() => {});
    return ok(res, await merchantOverview(req.auth.sub, req.query.days));
  }),
);

router.get(
  '/animals',
  asyncHandler(async (req, res) => {
    const animals = await Animal.find({ merchantId: req.auth.sub }).sort({ createdAt: -1 }).lean();
    const counts = await Booking.aggregate([
      { $match: { merchantId: req.auth.sub, status: { $in: ['pending', 'confirmed'] } } },
      { $group: { _id: '$animalId', upcoming: { $sum: 1 }, revenue: { $sum: '$pricing.subtotal' } } },
    ]);
    const byId = new Map(counts.map((row) => [String(row._id), row]));
    return ok(
      res,
      animals.map((animal) => ({
        ...serializeAnimal(animal),
        visibility: animal.visibility,
        isActive: animal.isActive,
        moderationStatus: animal.moderationStatus,
        stats: {
          upcoming: byId.get(String(animal._id))?.upcoming || 0,
          revenue: Math.round((byId.get(String(animal._id))?.revenue || 0) * 100) / 100,
        },
      })),
    );
  }),
);

router.post(
  '/animals',
  validate(merchantAnimalCreateSchema),
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    let digital = req.body.digital;
    if (!digital) {
      if (config.test || process.env.ALLOW_LOCAL_FALLBACK === 'true') digital = draftDigitalProfile(req.body);
      else if (hasChatProvider(config)) digital = await draftDigitalProfileWithModel({ animal: req.body, config });
      else throw new AppError(503, 'AI_UNAVAILABLE', 'Provide a digital profile or configure a model provider');
    }
    const animal = await Animal.create({
      ...req.body,
      digital,
      merchantId: req.auth.sub,
      city: req.body.city || req.account.city || '',
      ratingAverage: 0,
      reviewCount: 0,
      bookingCount: 0,
      moderationStatus: 'visible',
      featured: false,
    });
    await recordAudit(req, { action: 'listing.created', targetType: 'animal', targetId: animal._id });
    return created(res, serializeAnimal(animal));
  }),
);

router.get(
  '/animals/:animalId',
  validate(merchantAnimalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const animal = await ensureAnimal(req.params.animalId, req.auth.sub);
    const serialized = serializeAnimal(animal);
    return ok(res, {
      ...serialized,
      digital: { ...serialized.digital, hostNotes: animal.digital?.hostNotes || '', soundPack: animal.digital?.soundPack || 'species' },
      visibility: animal.visibility,
      isActive: animal.isActive,
      moderationStatus: animal.moderationStatus,
    });
  }),
);

router.patch(
  '/animals/:animalId',
  validate(merchantAnimalParamsSchema, 'params'),
  validate(merchantAnimalUpdateSchema),
  asyncHandler(async (req, res) => {
    const animal = await ensureAnimal(req.params.animalId, req.auth.sub);
    Object.assign(animal, req.body);
    if (!req.body.city && !animal.city) animal.city = req.account.city || '';
    await animal.save();
    await recordAudit(req, { action: 'listing.updated', targetType: 'animal', targetId: animal._id, metadata: { fields: Object.keys(req.body) } });
    const serialized = serializeAnimal(animal);
    return ok(res, {
      ...serialized,
      digital: { ...serialized.digital, hostNotes: animal.digital?.hostNotes || '', soundPack: animal.digital?.soundPack || 'species' },
    });
  }),
);

router.delete(
  '/animals/:animalId',
  validate(merchantAnimalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const animal = await ensureAnimal(req.params.animalId, req.auth.sub);
    const upcoming = await Booking.countDocuments({
      animalId: animal._id,
      status: { $in: ['pending', 'confirmed'] },
      date: { $gte: localDateString() },
    });
    if (upcoming > 0) throw conflict('Resolve upcoming visits before archiving this listing');
    animal.isActive = false;
    animal.visibility = 'private';
    animal.archivedAt = new Date();
    await animal.save();
    await recordAudit(req, { action: 'listing.archived', targetType: 'animal', targetId: animal._id });
    return noContent(res);
  }),
);

router.get(
  '/animals/:animalId/availability',
  validate(merchantAnimalParamsSchema, 'params'),
  validate(merchantAvailabilityQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const animal = await ensureAnimal(req.params.animalId, req.auth.sub);
    const [slots, booked] = await Promise.all([
      getConfiguredSlots(animal._id, req.query.date),
      getBookedStartTimes(animal._id, req.query.date),
    ]);
    return ok(res, {
      date: req.query.date,
      slots: slots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        enabled: slot.enabled,
        booked: booked.has(slot.startTime),
      })),
    });
  }),
);

router.put(
  '/animals/:animalId/availability',
  validate(merchantAnimalParamsSchema, 'params'),
  validate(merchantAvailabilitySchema),
  asyncHandler(async (req, res) => {
    const animal = await ensureAnimal(req.params.animalId, req.auth.sub);
    const availability = await saveDayAvailability(animal._id, req.body.date, req.body.slots);
    return ok(res, {
      date: availability.date,
      slots: availability.slots,
      animalId: String(animal._id),
    });
  }),
);

router.get(
  '/animals/:animalId/calendar',
  validate(merchantAnimalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const animal = await ensureAnimal(req.params.animalId, req.auth.sub);
    return ok(res, {
      animalId: String(animal._id),
      days: await availabilityCalendar(animal._id, { days: 21 }),
    });
  }),
);

router.get(
  '/bookings',
  validate(merchantBookingsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    await sweepPastBookings().catch(() => {});
    const { status, page, pageSize } = req.query;
    const { total, items } = await listMerchantBookings({
      merchantId: req.auth.sub,
      status,
      page,
      pageSize,
    });
    return ok(res, items.map((booking) => serializeBooking(booking, { viewer: 'merchant' })), {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
    });
  }),
);

router.get(
  '/bookings/:bookingId',
  validate(merchantParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForMerchant(req.params.bookingId, req.auth.sub);
    return ok(res, serializeBooking(booking, { viewer: 'merchant' }));
  }),
);

router.post(
  '/bookings/:bookingId/accept',
  validate(merchantParamsSchema, 'params'),
  validate(merchantNoteSchema),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForMerchant(req.params.bookingId, req.auth.sub);
    const updated = await acceptBooking({ booking, note: req.body.note, req });
    return ok(res, serializeBooking(updated, { viewer: 'merchant' }));
  }),
);

router.post(
  '/bookings/:bookingId/decline',
  validate(merchantParamsSchema, 'params'),
  validate(merchantNoteSchema),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForMerchant(req.params.bookingId, req.auth.sub);
    const updated = await declineBooking({ booking, note: req.body.note, req });
    return ok(res, serializeBooking(updated, { viewer: 'merchant' }));
  }),
);

router.post(
  '/bookings/:bookingId/complete',
  validate(merchantParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForMerchant(req.params.bookingId, req.auth.sub);
    const updated = await completeBooking({ booking, req });
    return ok(res, serializeBooking(updated, { viewer: 'merchant' }));
  }),
);

router.post(
  '/bookings/:bookingId/reschedule',
  validate(merchantParamsSchema, 'params'),
  validate(merchantRescheduleSchema),
  asyncHandler(async (req, res) => {
    const booking = await getBookingForMerchant(req.params.bookingId, req.auth.sub);
    const updated = await rescheduleBooking({
      booking,
      date: req.body.date,
      startTime: req.body.startTime,
      note: req.body.note,
      actorRole: 'merchant',
      req,
    });
    return ok(res, serializeBooking(updated, { viewer: 'merchant' }));
  }),
);

router.get(
  '/reviews',
  validate(merchantReviewsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    const filter = { merchantId: req.auth.sub, status: 'published' };
    const [total, reviews] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .populate('customerId', 'name avatarColor')
        .populate('animalId', 'name imageUrl')
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
      })),
      {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
      },
    );
  }),
);

router.post(
  '/reviews/:reviewId/reply',
  validate(merchantReviewParamsSchema, 'params'),
  validate(merchantReplySchema),
  asyncHandler(async (req, res) => {
    const review = await replyToReview({
      reviewId: req.params.reviewId,
      merchantId: req.auth.sub,
      body: req.body.body,
      req,
    });
    return ok(res, serializeReview(await review.populate('customerId', 'name avatarColor')));
  }),
);

router.patch(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'businessType', 'description', 'website', 'logoUrl', 'city'];
    for (const key of Object.keys(req.body)) {
      if (!allowed.includes(key)) throw new AppError(400, 'FIELD_NOT_ALLOWED', `The field "${key}" cannot be changed`);
      req.account[key] = req.body[key];
    }
    await req.account.save();
    await recordAudit(req, { action: 'merchant.profile_updated', targetType: 'merchant', targetId: req.auth.sub });
    return ok(res, { user: serializeAccount(req.account) });
  }),
);

router.post(
  '/animals/:animalId/digital/draft',
  validate(merchantAnimalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const animal = await ensureAnimal(req.params.animalId, req.auth.sub);
    const config = req.app.locals.config;
    if (config.test || process.env.ALLOW_LOCAL_FALLBACK === 'true') return ok(res, draftDigitalProfile(animal));
    if (!hasChatProvider(config)) throw new AppError(503, 'AI_UNAVAILABLE', 'Onboarding extraction requires a configured model provider');
    return ok(res, await draftDigitalProfileWithModel({ animal, config }));
  }),
);

router.get(
  '/animals/:animalId/sounds',
  validate(merchantAnimalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await ensureAnimal(req.params.animalId, req.auth.sub);
    const sounds = await AnimalSound.find({ animalId: req.params.animalId, status: 'active' }).sort({ createdAt: 1 });
    return ok(res, sounds.map(serializeSound));
  }),
);

router.post(
  '/animals/:animalId/sounds',
  validate(merchantAnimalParamsSchema, 'params'),
  audioMiddleware,
  asyncHandler(async (req, res) => {
    await ensureAnimal(req.params.animalId, req.auth.sub);
    if (!req.file) throw new AppError(400, 'AUDIO_REQUIRED', 'Choose an animal sound to upload');
    const label = String(req.body.label || '').trim();
    const mood = String(req.body.mood || '').trim();
    const behaviour = String(req.body.behaviour || '').trim();
    const allowedMoods = ['calm', 'gentle', 'playful', 'affectionate', 'sleepy', 'shy', 'alert'];
    if (label.length < 1 || label.length > 120) throw new AppError(422, 'INVALID_SOUND_LABEL', 'Sound label is required');
    if (!allowedMoods.includes(mood)) throw new AppError(422, 'INVALID_SOUND_MOOD', 'Choose a valid sound mood');

    let analysis;
    try {
      analysis = await analyzeAudio(req.file.buffer, req.file.mimetype);
    } catch (error) {
      throw new AppError(422, 'INVALID_AUDIO', error.message);
    }

    let embedding = [];
    if (req.body.embedding) {
      try {
        const parsed = JSON.parse(req.body.embedding);
        if (!Array.isArray(parsed) || parsed.length > 256 || parsed.some((value) => !Number.isFinite(Number(value)))) throw new Error();
        embedding = parsed.map((value) => Number(value));
      } catch {
        throw new AppError(422, 'INVALID_AUDIO_EMBEDDING', 'Audio signature must be a numeric array');
      }
    }

    const filename = `${req.auth.sub}-${randomUUID()}.${audioExtension(analysis.mimeType)}`;
    const directory = uploadDir(req);
    await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
    // The filename is generated locally; the validated audio bytes are the
    // only network-derived data written. This is the intended upload sink.
    // codeql[js/http-to-file-access]
    await fs.promises.writeFile(path.join(directory, filename), req.file.buffer, { flag: 'wx', mode: 0o600 });
    const sound = await AnimalSound.create({
      animalId: req.params.animalId,
      merchantId: req.auth.sub,
      label,
      mood,
      behaviour: behaviour.slice(0, 80),
      url: `/uploads/${filename}`,
      mimeType: analysis.mimeType,
      durationMs: analysis.durationMs,
      source: 'host',
      analysis: {
        model: embedding.length ? 'paw-acoustic-v1' : 'metadata-only',
        dimensions: embedding.length,
        embedding,
        status: embedding.length ? 'signature' : 'metadata-only',
      },
    });
    await recordAudit(req, { action: 'animal.sound_uploaded', targetType: 'animal', targetId: req.params.animalId, metadata: { soundId: String(sound._id) } });
    return created(res, serializeSound(sound));
  }),
);

router.delete(
  '/sounds/:soundId',
  asyncHandler(async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.soundId)) throw notFound('Sound not found');
    const sound = await AnimalSound.findOne({ _id: req.params.soundId, merchantId: req.auth.sub });
    if (!sound) throw notFound('Sound not found');
    const filename = path.basename(sound.url);
    await fs.promises.unlink(path.join(uploadDir(req), filename)).catch(() => {});
    await AnimalSound.deleteOne({ _id: sound._id });
    await recordAudit(req, { action: 'animal.sound_deleted', targetType: 'animal', targetId: sound.animalId, metadata: { soundId: String(sound._id) } });
    return noContent(res);
  }),
);

router.post(
  '/uploads',
  uploadMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, 'FILE_REQUIRED', 'Choose an image to upload');
    const filename = await storeImage(req.file.buffer, req.auth.sub, uploadDir(req));
    return created(res, { imageUrl: `/uploads/${filename}`, fileName: filename });
  }),
);

router.delete(
  '/uploads',
  asyncHandler(async (req, res) => {
    const imageUrl = String(req.body?.imageUrl || '');
    if (!imageUrl.startsWith('/uploads/')) throw new AppError(400, 'INVALID_IMAGE', 'Only uploaded images can be removed');
    const filename = path.basename(imageUrl);
    if (!ownsImage(filename, req.auth.sub)) throw new AppError(403, 'FORBIDDEN', 'You do not own that image');
    const filePath = path.join(uploadDir(req), filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return noContent(res);
  }),
);

export default router;
