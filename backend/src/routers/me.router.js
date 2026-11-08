import { Router } from 'express';
import mongoose from 'mongoose';
import Animal from '../models/Animal.js';
import Booking from '../models/Booking.js';
import ChatMemory from '../models/ChatMemory.js';
import Checkin from '../models/Checkin.js';
import Favorite from '../models/Favorite.js';
import Notification from '../models/Notification.js';
import UserRiskProfile from '../models/UserRiskProfile.js';
import { asyncHandler } from '../lib/errors.js';
import { ok } from '../lib/http.js';
import { localDateString } from '../lib/time.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { serializeAnimal, serializeAnimalSummary } from '../serializers/animal.js';
import { checkinHistory, todayCheckin, checkinStreak } from '../services/checkinService.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

const PUBLIC_FILTER = { isActive: true, visibility: 'public', moderationStatus: 'visible' };
const GOAL_TAGS = {
  calm: ['calm', 'quiet', 'gentle', 'lap cat'],
  active: ['playful', 'walks', 'active', 'outdoors', 'fetch'],
  support: ['gentle', 'calm', 'therapy trained'],
  company: ['affectionate', 'friendly', 'social', 'lap cat'],
  routine: ['quiet', 'calm', 'gentle'],
};

function visitSummary(booking) {
  if (!booking) return null;
  return {
    id: String(booking._id),
    status: booking.status,
    service: booking.service || { type: 'home_visit', label: 'Home visit', mode: 'in_person', durationMinutes: 120 },
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    total: booking.pricing?.total || 0,
    animal: booking.animalId?.name
      ? {
          id: String(booking.animalId._id),
          name: booking.animalId.name,
          imageUrl: booking.animalId.imageUrl,
          species: booking.animalId.species,
        }
      : null,
    merchant: booking.merchantId?.name ? { name: booking.merchantId.name, city: booking.merchantId.city } : null,
  };
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const customerId = req.auth.sub;
    const today = localDateString();

    const [checkin, streak, week, nextVisit, memories, favorites, completedVisits, messageAgg, checkedInCount, unread, profile, recommended] =
      await Promise.all([
        todayCheckin(customerId),
        checkinStreak(customerId),
        checkinHistory({ customerId, days: 7 }),
        Booking.findOne({ customerId, status: { $in: ['pending', 'confirmed'] }, date: { $gte: today } })
          .populate('animalId', 'name imageUrl species breed')
          .populate('merchantId', 'name city')
          .sort({ date: 1, startTime: 1 })
          .lean(),
        ChatMemory.find({ userId: String(customerId) }).sort({ lastMessageAt: -1 }).limit(4).lean(),
        Favorite.find({ customerId }).sort({ createdAt: -1 }).limit(4).populate({ path: 'animalId', populate: { path: 'merchantId', select: 'name businessType city verified' } }).lean(),
        Booking.countDocuments({ customerId, status: 'completed' }),
        ChatMemory.aggregate([
          { $match: { userId: String(customerId) } },
          { $group: { _id: null, messages: { $sum: { $size: '$messages' } } } },
        ]),
        Checkin.countDocuments({ customerId }),
        Notification.countDocuments({ recipientId: customerId, recipientRole: 'customer', readAt: null }),
        UserRiskProfile.findOne({ userId: String(customerId) }).lean(),
        (async () => {
          const preferred = req.account.preferredSpecies;
          const goals = req.account.goals || [];
          const tags = [...new Set(goals.flatMap((goal) => GOAL_TAGS[goal] || []))];
          const base = { ...PUBLIC_FILTER };
          if (preferred) base.species = preferred;
          const withTags = tags.length ? { ...base, tags: { $in: tags.slice(0, 10) } } : base;
          let animals = await Animal.find(withTags)
            .populate('merchantId', 'name businessType city verified ratingAverage reviewCount')
            .sort({ featured: -1, ratingAverage: -1, reviewCount: -1 })
            .limit(3)
            .lean();
          if (!animals.length) {
            animals = await Animal.find(base)
              .populate('merchantId', 'name businessType city verified ratingAverage reviewCount')
              .sort({ featured: -1, ratingAverage: -1 })
              .limit(3)
              .lean();
          }
          return animals.map((animal) => serializeAnimal(animal));
        })(),
      ]);

    const animalIds = memories.map((memory) => memory.animalId).filter(Boolean);
    const chatAnimals = await Animal.find({ _id: { $in: animalIds } }).select('name imageUrl species breed').lean();
    const animalById = new Map(chatAnimals.map((animal) => [String(animal._id), animal]));

    const activeChats = memories.map((memory) => {
      const animal = animalById.get(String(memory.animalId));
      const last = memory.messages[memory.messages.length - 1];
      return {
        animalId: String(memory.animalId),
        animalName: animal?.name || memory.animalName || 'Companion',
        imageUrl: animal?.imageUrl || '',
        species: animal?.species || '',
        breed: animal?.breed || '',
        mode: memory.chatMode,
        messageCount: memory.messages.length,
        preview: last ? String(last.content).slice(0, 110) : '',
        lastMessageAt: memory.lastMessageAt || memory.updatedAt,
      };
    });

    const favoriteAnimals = favorites
      .map((favorite) => favorite.animalId)
      .filter((animal) => animal && animal.name)
      .map((animal) => serializeAnimal(animal, { isFavorite: true }));

    return ok(res, {
      user: {
        name: req.account.name,
        goals: req.account.goals || [],
        preferredSpecies: req.account.preferredSpecies || '',
        onboardingComplete: Boolean(req.account.onboardingComplete),
        plusMember: Boolean(req.account.plusMember),
      },
      checkin: {
        today: checkin,
        streak,
        week: week.series,
        averageMood: week.averageMood,
        checkedIn: week.checkedIn,
      },
      nextVisit: visitSummary(nextVisit),
      activeChats,
      favorites: favoriteAnimals,
      recommended,
      stats: {
        completedVisits,
        messages: messageAgg[0]?.messages || 0,
        checkins: checkedInCount,
        saved: favorites.length,
        streak,
      },
      notifications: { unread },
      safety: { status: profile?.status || 'ok' },
    });
  }),
);

router.get(
  '/companions',
  asyncHandler(async (req, res) => {
    const customerId = req.auth.sub;
    const [memories, favorites, visits] = await Promise.all([
      ChatMemory.find({ userId: String(customerId) }).select('animalId messages lastMessageAt chatMode').lean(),
      Favorite.find({ customerId }).lean(),
      Booking.aggregate([
        { $match: { customerId: new mongoose.Types.ObjectId(String(customerId)), status: { $in: ['completed', 'confirmed', 'pending'] } } },
        { $group: { _id: '$animalId', visits: { $sum: 1 }, lastVisit: { $max: '$date' } } },
      ]),
    ]);

    const ids = new Set([
      ...memories.map((memory) => String(memory.animalId)),
      ...favorites.map((favorite) => String(favorite.animalId)),
      ...visits.map((visit) => String(visit._id)),
    ]);
    const animals = await Animal.find({ _id: { $in: [...ids] } })
      .populate('merchantId', 'name businessType city verified')
      .lean();
    const favoriteIds = new Set(favorites.map((favorite) => String(favorite.animalId)));
    const memoryById = new Map(memories.map((memory) => [String(memory.animalId), memory]));
    const visitById = new Map(visits.map((visit) => [String(visit._id), visit]));

    const items = animals
      .map((animal) => {
        const memory = memoryById.get(String(animal._id));
        const visit = visitById.get(String(animal._id));
        const messageCount = memory?.messages?.length || 0;
        const visitCount = visit?.visits || 0;
        const favorite = favoriteIds.has(String(animal._id));
        const points = messageCount + visitCount * 20 + (favorite ? 5 : 0);
        return {
          ...serializeAnimal(animal, { isFavorite: favorite }),
          relationship: {
            messages: messageCount,
            visits: visitCount,
            favorite,
            points,
            level: Math.max(1, Math.floor(points / 60) + 1),
            lastChatAt: memory?.lastMessageAt || null,
            lastVisit: visit?.lastVisit || null,
          },
        };
      })
      .sort((a, b) => b.relationship.points - a.relationship.points);

    return ok(res, items);
  }),
);

export default router;
