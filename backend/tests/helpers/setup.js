import { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testing-only-' + 'a'.repeat(64);
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'silent';
process.env.ACCESS_TOKEN_MINUTES = '15';

const { loadConfig } = await import('../../src/config/env.js');
const { createApp } = await import('../../src/app.js');
export { createApp };
const { default: Customer } = await import('../../src/models/Customer.js');
const { default: Merchant } = await import('../../src/models/Merchant.js');
const { default: Admin } = await import('../../src/models/Admin.js');
const { default: Animal } = await import('../../src/models/Animal.js');
const { default: AnimalAvailability } = await import('../../src/models/AnimalAvailability.js');
const { default: AnimalSound } = await import('../../src/models/AnimalSound.js');
const { default: Booking } = await import('../../src/models/Booking.js');
const { default: Payment } = await import('../../src/models/Payment.js');
const { default: Review } = await import('../../src/models/Review.js');
const { default: Favorite } = await import('../../src/models/Favorite.js');
const { default: ChatMemory } = await import('../../src/models/ChatMemory.js');
const { default: Checkin } = await import('../../src/models/Checkin.js');
const { default: DigitalPetState } = await import('../../src/models/DigitalPetState.js');
const { default: Notification } = await import('../../src/models/Notification.js');
const { default: RiskEvent } = await import('../../src/models/RiskEvent.js');
const { default: UserRiskProfile } = await import('../../src/models/UserRiskProfile.js');
const { default: Session } = await import('../../src/models/Session.js');
const { default: AuditEvent } = await import('../../src/models/AuditEvent.js');

const MODELS = [Customer, Merchant, Admin, Animal, AnimalAvailability, AnimalSound, Booking, Payment, Review, Favorite, ChatMemory, Checkin, DigitalPetState, Notification, RiskEvent, UserRiskProfile, Session, AuditEvent];
let mongoServer;
let config;

export const PASSWORD = 'PawCompanion!2026';
export const ADMIN_PASSWORD = 'AdminDemo!2026';

before(async () => {
  if (process.env.TEST_MONGO_URI) {
    process.env.MONGO_URI = process.env.TEST_MONGO_URI;
  } else {
    mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'pawcompanion-test' } });
    process.env.MONGO_URI = mongoServer.getUri('pawcompanion-test');
  }
  await mongoose.connect(process.env.MONGO_URI);
  config = loadConfig();
  await Promise.all(MODELS.map((model) => model.syncIndexes()));
});

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

export function app() {
  const budgets = { take: async () => true, close: async () => {} };
  return createApp({ config, budgets });
}

export async function customer(overrides = {}) {
  return Customer.create({
    name: 'Maya Chen',
    email: `maya-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    city: 'Portland',
    goals: ['calm', 'company'],
    preferredSpecies: 'cat',
    onboardingComplete: true,
    ...overrides,
  });
}

export async function merchant(overrides = {}) {
  return Merchant.create({
    name: 'Willow & Whiskers',
    businessType: 'Pet Cafe',
    email: `merchant-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    city: 'Portland',
    verified: true,
    ...overrides,
  });
}

export async function admin(overrides = {}) {
  return Admin.create({
    name: 'Avery Park',
    email: `admin-${Date.now()}@pawcompanion.test`,
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 4),
    ...overrides,
  });
}

export async function animal(merchantRecord, overrides = {}) {
  return Animal.create({
    merchantId: merchantRecord._id,
    name: 'Mochi',
    species: 'cat',
    breed: 'Domestic Shorthair',
    ageMonths: 36,
    price: 42,
    city: 'Portland',
    personality: 'Professional napper.',
    tags: ['quiet', 'lap cat'],
    imageUrl: '/animals/cat1.jpg',
    ...overrides,
  });
}

export async function login(agent, email, password = PASSWORD, role = 'customer') {
  const path = role === 'merchant' ? '/api/auth/merchant/login' : role === 'admin' ? '/api/auth/admin/login' : '/api/auth/customer/login';
  const response = await agent.post(path).send({ email, password });
  return response;
}

export function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

export function isoDaysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export { request, mongoose, config };
