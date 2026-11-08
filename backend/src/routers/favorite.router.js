import { Router } from 'express';
import Animal from '../models/Animal.js';
import Favorite from '../models/Favorite.js';
import { asyncHandler, notFound } from '../lib/errors.js';
import { ok } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { serializeAnimal } from '../serializers/animal.js';
import { animalParamsSchema } from '../validators/animal.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

const PUBLIC_FILTER = { isActive: true, visibility: 'public', moderationStatus: 'visible' };

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const favorites = await Favorite.find({ customerId: req.auth.sub }).sort({ createdAt: -1 }).lean();
    const animals = await Animal.find({ _id: { $in: favorites.map((favorite) => favorite.animalId) }, ...PUBLIC_FILTER })
      .populate('merchantId', 'name businessType city verified')
      .lean();
    const byId = new Map(animals.map((animal) => [String(animal._id), animal]));
    const items = favorites
      .map((favorite) => byId.get(String(favorite.animalId)))
      .filter(Boolean)
      .map((animal) => serializeAnimal(animal, { isFavorite: true }));
    return ok(res, items, { total: items.length });
  }),
);

router.get(
  '/ids',
  asyncHandler(async (req, res) => {
    const favorites = await Favorite.find({ customerId: req.auth.sub }).select('animalId').lean();
    return ok(res, favorites.map((favorite) => String(favorite.animalId)));
  }),
);

router.post(
  '/:animalId',
  validate(animalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findOne({ _id: req.params.animalId, ...PUBLIC_FILTER }).select('_id').lean();
    if (!animal) throw notFound('Companion not found');
    await Favorite.updateOne(
      { customerId: req.auth.sub, animalId: animal._id },
      { $setOnInsert: { customerId: req.auth.sub, animalId: animal._id } },
      { upsert: true },
    );
    return ok(res, { animalId: String(animal._id), favorite: true });
  }),
);

router.delete(
  '/:animalId',
  validate(animalParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    await Favorite.deleteOne({ customerId: req.auth.sub, animalId: req.params.animalId });
    return ok(res, { animalId: req.params.animalId, favorite: false });
  }),
);

export default router;
