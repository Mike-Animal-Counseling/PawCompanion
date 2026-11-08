import { Router } from 'express';
import Animal from '../models/Animal.js';
import Booking from '../models/Booking.js';
import ChatMemory from '../models/ChatMemory.js';
import Favorite from '../models/Favorite.js';
import Merchant from '../models/Merchant.js';
import Review from '../models/Review.js';
import { asyncHandler } from '../lib/errors.js';
import { notFound } from '../lib/errors.js';
import { escapeRegex } from '../lib/ids.js';
import { ok } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { serializeAnimal } from '../serializers/animal.js';
import { serializeReview } from '../serializers/review.js';
import { getDayAvailability, findNextAvailable } from '../services/availabilityService.js';
import {
  animalListQuerySchema,
  animalParamsSchema,
  animalReviewsQuerySchema,
  availabilityQuerySchema,
} from '../validators/animal.js';

const router = Router();

const PUBLIC_FILTER = { isActive: true, visibility: 'public', moderationStatus: 'visible' };
const MERCHANT_FIELDS = 'name businessType city description website logoUrl verified ratingAverage reviewCount';
const SORT_MAP = {
  recommended: { featured: -1, ratingAverage: -1, reviewCount: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { ratingAverage: -1, reviewCount: -1 },
};

function listFilter(query) {
  const filter = { ...PUBLIC_FILTER };
  if (query.species) filter.species = query.species;
  if (query.tag) filter.tags = query.tag;
  if (query.city) filter.city = { $regex: `^${escapeRegex(query.city)}$`, $options: 'i' };
  if (query.featured) filter.featured = query.featured === 'true';
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
  }
  if (query.q) {
    const pattern = { $regex: escapeRegex(query.q), $options: 'i' };
    filter.$or = [{ name: pattern }, { breed: pattern }, { personality: pattern }, { tags: pattern }, { city: pattern }];
  }
  return filter;
}

async function favoriteIdsFor(req, animalIds) {
  if (req.auth?.role !== 'customer' || !animalIds.length) return new Set();
  const favorites = await Favorite.find({ customerId: req.auth.sub, animalId: { $in: animalIds } })
    .select('animalId')
    .lean();
  return new Set(favorites.map((favorite) => String(favorite.animalId)));
}

router.get(
  '/',
  optionalAuth,
  validate(animalListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query;
    const page = query.page;
    const pageSize = query.pageSize;
    const filter = listFilter(query);

    const [total, animals] = await Promise.all([
      Animal.countDocuments(filter),
      Animal.find(filter)
        .populate('merchantId', MERCHANT_FIELDS)
        .sort(SORT_MAP[query.sort])
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    const favorites = await favoriteIdsFor(req, animals.map((animal) => animal._id));
    const items = animals.map((animal) => serializeAnimal(animal, { isFavorite: favorites.has(String(animal._id)) }));

    return ok(res, items, {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      sort: query.sort,
    });
  }),
);

router.get(
  '/facets',
  asyncHandler(async (_req, res) => {
    const [species, tags, cities, priceRange, total, hosts] = await Promise.all([
      Animal.aggregate([
        { $match: PUBLIC_FILTER },
        { $group: { _id: '$species', count: { $sum: 1 } } },
        { $project: { _id: 0, species: '$_id', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Animal.aggregate([
        { $match: PUBLIC_FILTER },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $project: { _id: 0, tag: '$_id', count: 1 } },
        { $sort: { count: -1, tag: 1 } },
        { $limit: 24 },
      ]),
      Animal.aggregate([
        { $match: PUBLIC_FILTER },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $project: { _id: 0, city: '$_id', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Animal.aggregate([
        { $match: PUBLIC_FILTER },
        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
      ]),
      Animal.countDocuments(PUBLIC_FILTER),
      Merchant.countDocuments({ status: 'active', verified: true, _id: { $in: await Animal.distinct('merchantId', PUBLIC_FILTER) } }),
    ]);

    return ok(res, {
      total,
      hosts,
      species: species.filter((item) => item.species),
      tags,
      cities: cities.filter((item) => item.city),
      priceRange: priceRange[0] ? { min: priceRange[0].min, max: priceRange[0].max } : { min: 0, max: 0 },
    });
  }),
);

router.get(
  '/:animalId',
  optionalAuth,
  validate(animalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findOne({ _id: req.params.animalId, ...PUBLIC_FILTER })
      .populate('merchantId', MERCHANT_FIELDS)
      .lean();
    if (!animal) throw notFound('Companion not found');

    const [recentReviews, ratingRows, next, favorite, memory, visits] = await Promise.all([
      Review.find({ animalId: animal._id, status: 'published' })
        .populate('customerId', 'name avatarColor')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Review.aggregate([
        { $match: { animalId: animal._id, status: 'published' } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      findNextAvailable(animal._id, { days: 14 }),
      req.auth?.role === 'customer'
        ? Favorite.exists({ customerId: req.auth.sub, animalId: animal._id })
        : null,
      req.auth?.role === 'customer'
        ? ChatMemory.findOne({ userId: req.auth.sub, animalId: String(animal._id) }).select('messages lastMessageAt chatMode').lean()
        : null,
      req.auth?.role === 'customer'
        ? Booking.countDocuments({ customerId: req.auth.sub, animalId: animal._id, status: { $in: ['completed', 'confirmed', 'pending'] } })
        : 0,
    ]);

    const relationship =
      req.auth?.role === 'customer'
        ? (() => {
            const messages = memory?.messages?.length || 0;
            const points = messages + visits * 20 + (favorite ? 5 : 0);
            return {
              messages,
              visits,
              favorite: Boolean(favorite),
              points,
              level: Math.max(1, Math.floor(points / 60) + 1),
              lastChatAt: memory?.lastMessageAt || null,
              mode: memory?.chatMode || 'play',
            };
          })()
        : null;

    return ok(res, {
      ...serializeAnimal(animal, { isFavorite: Boolean(favorite) }),
      relationship,
      reviews: {
        recent: recentReviews.map(serializeReview),
        breakdown: [5, 4, 3, 2, 1].map((rating) => ({
          rating,
          count: ratingRows.find((row) => row._id === rating)?.count || 0,
        })),
      },
      availability: {
        next: next ? { date: next.date, slots: next.slots } : null,
      },
    });
  }),
);

router.get(
  '/:animalId/availability',
  validate(animalParamsSchema, 'params'),
  validate(availabilityQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findOne({ _id: req.params.animalId, ...PUBLIC_FILTER }).select('_id').lean();
    if (!animal) throw notFound('Companion not found');
    const day = await getDayAvailability(animal._id, req.query.date);
    return ok(res, day);
  }),
);

router.get(
  '/:animalId/reviews',
  validate(animalParamsSchema, 'params'),
  validate(animalReviewsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findOne({ _id: req.params.animalId, ...PUBLIC_FILTER }).select('_id').lean();
    if (!animal) throw notFound('Companion not found');
    const { page, pageSize, rating } = req.query;
    const filter = { animalId: animal._id, status: 'published', ...(rating ? { rating } : {}) };
    const [total, reviews] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .populate('customerId', 'name avatarColor')
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);
    return ok(res, reviews.map(serializeReview), {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
    });
  }),
);

export default router;
