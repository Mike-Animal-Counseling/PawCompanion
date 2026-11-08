import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import Admin from '../models/Admin.js';
import Animal from '../models/Animal.js';
import AnimalAvailability from '../models/AnimalAvailability.js';
import AuditEvent from '../models/AuditEvent.js';
import Booking from '../models/Booking.js';
import ChatMemory from '../models/ChatMemory.js';
import Checkin from '../models/Checkin.js';
import Customer from '../models/Customer.js';
import Favorite from '../models/Favorite.js';
import Merchant from '../models/Merchant.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import RiskEvent from '../models/RiskEvent.js';
import Session from '../models/Session.js';
import UserRiskProfile from '../models/UserRiskProfile.js';
import { calculatePricing, defaultSlots, endTimeFor } from '../services/scheduling.js';
import { addDaysString, dateTimeFrom, localDateString } from '../lib/time.js';
import { recomputeAnimalRating, recomputeMerchantRating } from '../services/reviewService.js';
import { logger } from '../lib/logger.js';
import { animals, checkinSeeds, customers, DEMO_PASSWORD, merchants, reviewSeeds, upcomingBookings } from '../data/seedData.js';

const MERCHANT_PASSWORD = 'MerchantDemo!2026';
const ADMIN_PASSWORD = 'AdminDemo!2026';

function receipt(index) {
  return `PC-SEED-${String(index).padStart(5, '0')}`;
}

async function resetData() {
  await Promise.all(
    [
      Admin,
      Animal,
      AnimalAvailability,
      AuditEvent,
      Booking,
      ChatMemory,
      Checkin,
      Customer,
      Favorite,
      Merchant,
      Notification,
      Payment,
      Review,
      RiskEvent,
      Session,
      UserRiskProfile,
    ].map((model) => model.deleteMany({})),
  );
}

async function createPayment({ booking, amount, status = 'succeeded', index, createdAt }) {
  const payment = await Payment.create({
    bookingId: booking._id,
    customerId: booking.customerId,
    merchantId: booking.merchantId,
    provider: 'sandbox',
    providerRef: `sbx_seed_${index}_${String(booking._id).slice(-6)}`,
    amount,
    currency: 'USD',
    method: 'sandbox_card',
    status,
    receiptNumber: receipt(index),
    ...(status === 'refunded' ? { refundedAt: createdAt || new Date(), refundRef: `rfnd_seed_${index}` } : {}),
    createdAt,
  });
  return payment;
}

async function createSeedBooking({ customer, animal, merchant, date, start, status, note = '', index, createdAt, service = 'home_visit' }) {
  const pricing = calculatePricing(animal.price, service);
  const serviceEndTime = endTimeFor(start, pricing.service.durationMinutes);
  const active = ['pending', 'confirmed'].includes(status);
  const history = [{ status: 'pending', at: createdAt || new Date(), actorRole: 'customer', note: 'Visit requested' }];
  if (['confirmed', 'completed'].includes(status)) {
    history.push({ status: 'confirmed', at: createdAt || new Date(), actorRole: 'merchant', note: note || 'Confirmed by host' });
  }
  if (status === 'completed') {
    history.push({ status: 'completed', at: dateTimeFrom(date, start), actorRole: 'system', note: 'Visit completed' });
  }

  const booking = await Booking.create({
    customerId: customer._id,
    merchantId: merchant._id,
    animalId: animal._id,
    animalSnapshot: { name: animal.name, imageUrl: animal.imageUrl, species: animal.species, breed: animal.breed },
    service: pricing.service,
    date,
    startTime: start,
    endTime: serviceEndTime,
    durationHours: pricing.hours,
    status,
    active,
    contact: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: '',
      city: customer.city || animal.city || '',
      notes: '',
    },
    pricing,
    paymentStatus: status === 'cancelled' || status === 'declined' ? 'refunded' : 'paid',
    statusHistory: history,
    ...(status === 'cancelled' || status === 'declined'
      ? { cancellation: { by: status === 'declined' ? 'merchant' : 'customer', reason: note || 'Seed data', at: createdAt, refundAmount: pricing.total } }
      : {}),
    createdAt,
    updatedAt: createdAt,
  });

  const payment = await createPayment({
    booking,
    amount: pricing.total,
    status: status === 'cancelled' || status === 'declined' ? 'refunded' : 'succeeded',
    index,
    createdAt,
  });
  booking.paymentId = payment._id;
  await booking.save();
  return booking;
}

export async function seedDatabase({ reset = false } = {}) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
    throw new Error('Refusing to seed production. Set ALLOW_SEED_IN_PRODUCTION=true for an explicit demo deployment.');
  }

  if (reset) await resetData();
  else if (await Animal.countDocuments()) {
    logger.info('seed.skipped', { reason: 'data already present' });
    return { skipped: true };
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const merchantHash = await bcrypt.hash(MERCHANT_PASSWORD, 12);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const merchantByKey = new Map();
  for (const entry of merchants) {
    const merchant = await Merchant.create({
      name: entry.name,
      businessType: entry.businessType,
      email: entry.email,
      passwordHash: merchantHash,
      city: entry.city,
      description: entry.description,
      website: entry.website,
      verified: entry.verified,
      status: 'active',
    });
    merchantByKey.set(entry.key, merchant);
  }

  const customerByKey = new Map();
  for (const entry of customers) {
    const customer = await Customer.create({
      name: entry.name,
      email: entry.email,
      passwordHash,
      phone: entry.phone,
      city: entry.city,
      safetyConsentAt: new Date(),
      marketingOptIn: entry.key === 'maya',
      goals:
        entry.key === 'maya'
          ? ['calm', 'company']
          : entry.key === 'jordan'
            ? ['active', 'routine']
            : entry.key === 'priya'
              ? ['support', 'calm']
              : ['company'],
      preferredSpecies: entry.key === 'jordan' ? 'dog' : 'cat',
      onboardingComplete: entry.key !== 'sam',
      timezone: 'America/Los_Angeles',
    });
    customerByKey.set(entry.key, customer);
  }

  const admin = await Admin.create({
    name: 'Avery Park',
    email: 'admin@pawcompanion.app',
    passwordHash: adminHash,
  });

  const animalByKey = new Map();
  for (const entry of animals) {
    const merchant = merchantByKey.get(entry.merchant);
    const animal = await Animal.create({
      ...entry,
      merchantId: merchant._id,
      gallery: [entry.imageUrl],
      visibility: 'public',
      isActive: true,
      moderationStatus: 'visible',
      ratingAverage: 0,
      reviewCount: 0,
      bookingCount: 0,
      featured: Boolean(entry.featured),
    });
    animalByKey.set(entry.key, animal);
  }

  // Availability for the next 21 days, with Sundays closed and one rotating
  // slot off so the booking UI shows realistic variation.
  const today = localDateString();
  const dates = Array.from({ length: 21 }, (_, index) => addDaysString(today, index + 1));
  let animalIndex = 0;
  for (const animal of animalByKey.values()) {
    for (const date of dates) {
      const weekday = new Date(`${date}T12:00:00`).getDay();
      const slots = defaultSlots().map((slot, slotIndex) => ({
        ...slot,
        enabled: weekday !== 0 && (weekday + slotIndex + animalIndex) % 7 !== 0,
      }));
      await AnimalAvailability.create({ animalId: animal._id, date, slots });
    }
    animalIndex += 1;
  }

  let bookingIndex = 1;
  const reviewBooking = new Map();
  for (const seed of reviewSeeds) {
    const animal = animalByKey.get(seed.animal);
    const merchant = merchantByKey.get(animals.find((item) => item.key === seed.animal).merchant);
    const customer = customerByKey.get(seed.customer);
    const date = addDaysString(today, -seed.daysAgo);
    const createdAt = dateTimeFrom(addDaysString(date, -2), '12:00');
    const booking = await createSeedBooking({
      customer,
      animal,
      merchant,
      date,
      start: seed.start,
      status: 'completed',
      index: bookingIndex,
      createdAt,
    });
    reviewBooking.set(`${seed.animal}:${seed.customer}`, booking);
    bookingIndex += 1;
  }

  const upcomingCreated = [];
  for (const seed of upcomingBookings) {
    const animal = animalByKey.get(seed.animal);
    const merchant = merchantByKey.get(animals.find((item) => item.key === seed.animal).merchant);
    const customer = customerByKey.get(seed.customer);
    const booking = await createSeedBooking({
      customer,
      animal,
      merchant,
      date: addDaysString(today, seed.daysFromNow),
      start: seed.start,
      status: seed.status,
      note: seed.note,
      service: seed.service,
      index: bookingIndex,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    upcomingCreated.push(booking);
    bookingIndex += 1;

    // Keep the seeded booking and the published calendar consistent even when
    // the chosen day would otherwise have been closed by the rotation above.
    const availability = await AnimalAvailability.findOne({ animalId: animal._id, date: booking.date });
    if (availability) {
      const slot = availability.slots.find((item) => item.startTime === booking.startTime);
      if (slot && !slot.enabled) {
        slot.enabled = true;
        await availability.save();
      }
    }
  }

  // A resolved cancellation and a host decline give the merchant/admin views
  // something other than happy-path data to render.
  await createSeedBooking({
    customer: customerByKey.get('sam'),
    animal: animalByKey.get('panda'),
    merchant: merchantByKey.get('sunny'),
    date: addDaysString(today, -3),
    start: '11:00',
    status: 'declined',
    note: 'Panda was unwell — full refund issued',
    index: bookingIndex,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });
  bookingIndex += 1;
  await createSeedBooking({
    customer: customerByKey.get('sam'),
    animal: animalByKey.get('willow-dog'),
    merchant: merchantByKey.get('sunny'),
    date: addDaysString(today, -1),
    start: '15:00',
    status: 'cancelled',
    note: 'Schedule changed',
    index: bookingIndex,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  });

  for (const seed of reviewSeeds) {
    const booking = reviewBooking.get(`${seed.animal}:${seed.customer}`);
    const animal = animalByKey.get(seed.animal);
    const customer = customerByKey.get(seed.customer);
    const merchant = merchantByKey.get(animals.find((item) => item.key === seed.animal).merchant);
    const review = await Review.create({
      bookingId: booking._id,
      customerId: customer._id,
      animalId: animal._id,
      merchantId: merchant._id,
      rating: seed.rating,
      title: seed.title,
      body: seed.body,
      status: 'published',
      createdAt: booking.createdAt,
      ...(seed.rating === 5 && seed.animal === 'misty'
        ? { merchantReply: { body: 'Thank you for the kind words — Misty has been insufferably pleased with herself all week.', at: new Date() } }
        : {}),
    });
    booking.reviewId = review._id;
    await booking.save();
  }

  for (const animal of animalByKey.values()) {
    await recomputeAnimalRating(animal._id);
    const completed = await Booking.countDocuments({ animalId: animal._id, status: { $in: ['completed', 'confirmed', 'pending'] } });
    await Animal.updateOne({ _id: animal._id }, { $set: { bookingCount: completed } });
  }
  for (const merchant of merchantByKey.values()) {
    await recomputeMerchantRating(merchant._id);
  }

  const maya = customerByKey.get('maya');
  await Favorite.insertMany([
    { customerId: maya._id, animalId: animalByKey.get('mochi')._id },
    { customerId: maya._id, animalId: animalByKey.get('milo')._id },
    { customerId: maya._id, animalId: animalByKey.get('misty')._id },
    { customerId: customerByKey.get('jordan')._id, animalId: animalByKey.get('waffles')._id },
  ]);

  for (const seed of checkinSeeds) {
    const customer = customerByKey.get(seed.customer);
    const animal = animalByKey.get(seed.animal);
    if (!customer || !animal) continue;
    const date = addDaysString(today, -seed.daysAgo);
    await Checkin.create({
      customerId: customer._id,
      date,
      mood: seed.mood,
      energy: seed.energy,
      note: seed.note,
      tags: seed.tags,
      animalId: animal._id,
      animalName: animal.name,
      aiReply: seed.reply,
      safetyLevel: 'none',
      mode: seed.mood <= 2 || seed.tags.includes('anxious') || seed.tags.includes('lonely') || seed.tags.includes('overwhelmed') ? 'support' : 'play',
      createdAt: dateTimeFrom(date, '08:30'),
      updatedAt: dateTimeFrom(date, '08:30'),
    });
  }

  const chatSeeds = [
    {
      customer: 'maya',
      animal: 'mochi',
      mode: 'play',
      messages: [
        { role: 'user', content: 'Hi Mochi. Long day. I mostly want to sit somewhere quiet.', minutesAgo: 180 },
        { role: 'assistant', content: 'You found my sunbeam. Stay a while. You do not have to explain the whole day — what is the quietest part of it so far?', minutesAgo: 179 },
        { role: 'user', content: 'Probably right now. I have been go go go since 8.', minutesAgo: 176 },
        { role: 'assistant', content: 'Then let us make this a small island. One slow breath, then tell me one thing that went right today, even if it was tiny.', minutesAgo: 175 },
        { role: 'user', content: 'I made it through the presentation without crying.', minutesAgo: 170 },
        { role: 'assistant', content: 'That is not tiny. That is you doing something hard with everyone looking. I am glad you told me.', minutesAgo: 169 },
      ],
    },
    {
      customer: 'maya',
      animal: 'misty',
      mode: 'support',
      messages: [
        { role: 'user', content: 'I feel like I am behind everyone my age.', minutesAgo: 2880 },
        { role: 'assistant', content: 'That sounds exhausting — carrying a race you did not sign up for. I am not going to tell you the timeline is fake. I am going to ask: whose voice does that “behind” feeling sound like?', minutesAgo: 2879 },
        { role: 'user', content: 'Probably my family.', minutesAgo: 2876 },
        { role: 'assistant', content: 'Family voices can be very loud, even from far away. You are allowed to have your own pace. What is one thing you are doing at your own pace right now?', minutesAgo: 2875 },
      ],
    },
    {
      customer: 'maya',
      animal: 'milo',
      mode: 'play',
      messages: [
        { role: 'user', content: 'Milo, I booked our visit. I am a little nervous.', minutesAgo: 1440 },
        { role: 'assistant', content: 'I will be the calm one. We can walk slowly, sniff everything, and you do not have to make conversation the whole time. What would make the first five minutes easier?', minutesAgo: 1439 },
      ],
    },
    {
      customer: 'jordan',
      animal: 'waffles',
      mode: 'play',
      messages: [
        { role: 'user', content: 'Waffles. I need a ridiculous amount of corgi energy today.', minutesAgo: 600 },
        { role: 'assistant', content: 'I have been saving up zoomies specifically for this. We can start with fetch, then a very serious patrol of the park. What time are you thinking?', minutesAgo: 599 },
      ],
    },
    {
      customer: 'priya',
      animal: 'misty',
      mode: 'support',
      messages: [
        { role: 'user', content: 'I cancelled plans tonight and I feel guilty about it.', minutesAgo: 720 },
        { role: 'assistant', content: 'Cancelling because you need rest is not the same as letting someone down. Guilt can show up even when the choice is right. What would help the evening feel less like a debt?', minutesAgo: 719 },
      ],
    },
  ];

  for (const seed of chatSeeds) {
    const customer = customerByKey.get(seed.customer);
    const animal = animalByKey.get(seed.animal);
    if (!customer || !animal) continue;
    const messages = seed.messages.map((message) => ({
      role: message.role,
      content: message.content,
      timestamp: new Date(Date.now() - message.minutesAgo * 60 * 1000),
    }));
    await ChatMemory.create({
      userId: String(customer._id),
      animalId: String(animal._id),
      animalName: animal.name,
      messages,
      chatMode: seed.mode,
      supportTurnsLeft: seed.mode === 'support' ? 3 : 0,
      lastMessageAt: messages[messages.length - 1].timestamp,
      createdAt: messages[0].timestamp,
      updatedAt: messages[messages.length - 1].timestamp,
    });
  }

  await Notification.insertMany([
    {
      recipientId: maya._id,
      recipientRole: 'customer',
      type: 'booking_confirmed',
      title: 'Milo confirmed your visit',
      body: 'Your visit is confirmed. Bring comfortable shoes — Milo likes a slow walk.',
      link: `/visits/${upcomingCreated[0]._id}`,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      recipientId: maya._id,
      recipientRole: 'customer',
      type: 'booking_received',
      title: 'Visit requested',
      body: 'Clementine · waiting for the host to confirm.',
      link: `/visits/${upcomingCreated[1]._id}`,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      recipientId: maya._id,
      recipientRole: 'customer',
      type: 'system',
      title: 'Welcome to PawCompanion',
      body: 'Your companion chats are private. You can review or delete your safety data any time.',
      link: '/account',
      readAt: new Date(),
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      recipientId: merchantByKey.get('willow')._id,
      recipientRole: 'merchant',
      type: 'booking_received',
      title: 'New visit request',
      body: 'Maya Chen booked Clementine.',
      link: '/merchant/bookings',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      recipientId: merchantByKey.get('rainy')._id,
      recipientRole: 'merchant',
      type: 'review_received',
      title: 'New guest review',
      body: 'Priya rated Misty 5/5.',
      link: '/merchant/reviews',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
    {
      recipientId: admin._id,
      recipientRole: 'admin',
      type: 'system',
      title: 'Weekly safety digest is ready',
      body: '1 account is on watch. Review the safety queue when you have a moment.',
      link: '/admin',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  ]);

  // Synthetic safety demo: no message content is stored, only derived signals.
  const sam = customerByKey.get('sam');
  const riskAnimal = animalByKey.get('tiger');
  const riskEvents = [
    { level: 'medium', score: 0.62, daysAgo: 1 },
    { level: 'medium', score: 0.66, daysAgo: 4 },
    { level: 'medium', score: 0.61, daysAgo: 6 },
  ];
  for (const event of riskEvents) {
    await RiskEvent.create({
      userId: String(sam._id),
      animalId: String(riskAnimal._id),
      level: event.level,
      score: event.score,
      source: 'seed_demo',
      timestamp: new Date(Date.now() - event.daysAgo * 24 * 60 * 60 * 1000),
    });
  }
  await UserRiskProfile.create({
    userId: String(sam._id),
    score7d: 11.4,
    score30d: 12.2,
    events7d: 3,
    events30d: 3,
    maxLevel30d: 'medium',
    lastRiskAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'watch',
    flagReason: 'score_7d',
  });

  await AuditEvent.insertMany([
    { actorId: String(admin._id), actorRole: 'admin', action: 'merchant.verified', targetType: 'merchant', targetId: String(merchantByKey.get('willow')._id), metadata: { note: 'Docs and insurance checked' }, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    { actorId: String(admin._id), actorRole: 'admin', action: 'merchant.verified', targetType: 'merchant', targetId: String(merchantByKey.get('rainy')._id), metadata: { note: 'Foster licence verified' }, createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000) },
    { actorId: String(admin._id), actorRole: 'admin', action: 'listing.approved', targetType: 'animal', targetId: String(animalByKey.get('mochi')._id), metadata: { note: 'Photos and temperament notes look good' }, createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
  ]);

  for (const model of [Animal, AnimalAvailability, AuditEvent, Booking, ChatMemory, Checkin, Customer, Favorite, Merchant, Notification, Payment, Review, RiskEvent, Session, UserRiskProfile, Admin]) {
    await model.createIndexes();
  }

  logger.info('seed.completed', {
    merchants: merchantByKey.size,
    animals: animalByKey.size,
    customers: customerByKey.size,
    bookings: bookingIndex - 1,
    reviews: reviewSeeds.length,
  });

  return {
    skipped: false,
    credentials: {
      customer: { email: 'maya@example.com', password: DEMO_PASSWORD },
      merchant: { email: 'hello@willowandwhiskers.example', password: MERCHANT_PASSWORD },
      admin: { email: 'admin@pawcompanion.app', password: ADMIN_PASSWORD },
    },
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  const reset = process.argv.includes('--reset');
  try {
    await connectDB(process.env.MONGO_URI);
    const result = await seedDatabase({ reset });
    if (result.credentials) {
      console.log('\nDemo accounts');
      console.log('  customer:', result.credentials.customer.email, '/', result.credentials.customer.password);
      console.log('  merchant:', result.credentials.merchant.email, '/', result.credentials.merchant.password);
      console.log('  admin:   ', result.credentials.admin.email, '/', result.credentials.admin.password);
    }
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}
