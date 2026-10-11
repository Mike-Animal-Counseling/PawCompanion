import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
process.env.JWT_SECRET = 'testing-only-' + 'a'.repeat(64);
process.env.NODE_ENV = 'test';
const { createApp } = await import('../src/app.js');
const { loadSecurity } = await import('../src/security.js');
const { signAuthToken } = await import('../src/middleware/auth.js');
const { encodeImage, ownsImage } = await import('../src/services/secureImage.js');
const { default: Customer } = await import('../src/models/Customer.js');
const { default: Merchant } = await import('../src/models/Merchant.js');
const owner = { _id: 'a'.repeat(24), email: 'owner@example.invalid', name: 'Synthetic owner', status: 'active' };
Customer.findById = async id => id === owner._id ? owner : null;
Merchant.findById = async () => null;
const config = loadSecurity();
const budgets = { take: async () => true };
const app = createApp({ config, budgets });
const token = signAuthToken({ sub: owner._id, role: 'customer', email: owner.email });
test('anonymous requests cannot access chat, bookings or merchant uploads', async () => {
  for (const path of ['/api/ai/memory/' + owner._id + '/' + 'b'.repeat(24), '/api/booking/my/' + owner._id, '/api/merchant/dashboard']) assert.equal((await request(app).get(path)).status, 401);
  assert.equal((await request(app).post('/api/ai/chat').send({ userId: owner._id, message: 'hi' })).status, 401);
});
test('customer cannot impersonate another user through URL or JSON identifiers', async () => {
  const other = 'c'.repeat(24);
  assert.equal((await request(app).get('/api/booking/my/' + other).auth(token, { type: 'bearer' })).status, 403);
  assert.equal((await request(app).get('/api/ai/risk-profile/' + other).auth(token, { type: 'bearer' })).status, 403);
  assert.equal((await request(app).post('/api/booking/create').auth(token, { type: 'bearer' }).send({ userId: other })).status, 403);
  assert.equal((await request(app).delete('/api/booking/' + 'd'.repeat(24)).query({ userId: other }).auth(token, { type: 'bearer' })).status, 403);
});

test('NoSQL-shaped and malformed conversation identifiers fail before database access', async () => {
  assert.equal((await request(app).post('/api/ai/chat').auth(token, { type: 'bearer' }).send({ animalId: { $ne: null }, message: 'synthetic' })).status, 400);
  assert.equal((await request(app).get('/api/ai/memory/' + owner._id + '/invalid').auth(token, { type: 'bearer' })).status, 400);
});
test('rejects legacy forged merchant tokens and wrong-role access', async () => {
  const forged = jwt.sign({ sub: owner._id, role: 'merchant' }, 'merchant-portal-dev-secret');
  assert.equal((await request(app).get('/api/merchant/dashboard').auth(forged, { type: 'bearer' })).status, 401);
  assert.equal((await request(app).get('/api/merchant/dashboard').auth(token, { type: 'bearer' })).status, 403);
});
test('untrusted origins and oversized requests fail before application work', async () => {
  assert.equal((await request(app).get('/api/health').set('Origin', 'https://attacker.invalid')).status, 403);
  assert.equal((await request(app).post('/api/auth/customer/login').send({ password: 'x'.repeat(20000) })).status, 413);
  assert.equal((await request(app).post('/api/notification/email').send({})).status, 404);
  assert.equal((await request(app).get('/uploads/legacy.html')).status, 404);
});
test('production never confirms simulated checkout or payments', async () => {
  const productionApp = createApp({ config: { ...config, production: true, trustProxy: 'loopback' }, budgets });
  process.env.NODE_ENV = 'production'; process.env.REDIS_URL = 'rediss://example.invalid'; process.env.CORS_ORIGIN = 'https://example.invalid';
  try {
    assert.equal((await request(productionApp).post('/api/booking/create').set('X-Forwarded-Proto', 'https').auth(token, { type: 'bearer' }).send({})).status, 503);
    assert.equal((await request(productionApp).patch('/api/booking/' + 'b'.repeat(24) + '/reschedule').set('X-Forwarded-Proto', 'https').auth(token, { type: 'bearer' }).send({})).status, 503);
    assert.equal((await request(productionApp).post('/api/booking/checkout').set('X-Forwarded-Proto', 'https').auth(token, { type: 'bearer' }).send({})).status, 503);
    assert.equal((await request(productionApp).post('/api/payment/process').set('X-Forwarded-Proto', 'https').auth(token, { type: 'bearer' }).send({})).status, 503);
  } finally { process.env.NODE_ENV = 'test'; delete process.env.REDIS_URL; delete process.env.CORS_ORIGIN; }
});
test('decodes and re-encodes actual images; refuses HTML and cross-owner deletes', async () => {
  await assert.rejects(encodeImage(Buffer.from('<html><script>alert(1)</script></html>')));
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  assert.equal((await sharp(await encodeImage(png)).metadata()).format, 'jpeg');
  assert.equal(ownsImage(owner._id + '-00000000-0000-0000-0000-000000000000.jpeg', 'b'.repeat(24)), false);
});
test('shared budget failure closes access', async () => {
  const failed = createApp({ config, budgets: { take: async () => { throw new Error('offline'); } } });
  assert.equal((await request(failed).get('/api/health')).status, 503);
});
