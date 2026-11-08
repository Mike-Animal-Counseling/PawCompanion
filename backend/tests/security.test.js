import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { app, createApp, customer, login, request } from './helpers/setup.js';
import { loadConfig } from '../src/config/env.js';

test('health is available without authentication and carries security headers', async () => {
  const response = await request(app()).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.match(response.headers['content-security-policy'], /default-src 'none'/);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.match(response.headers['x-request-id'], /[a-f0-9-]{8,}/);
});

test('untrusted origins are rejected before application work', async () => {
  const response = await request(app()).get('/api/animals').set('Origin', 'https://attacker.invalid');
  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'ORIGIN_NOT_ALLOWED');
  const allowed = await request(app()).get('/api/animals').set('Origin', 'http://localhost:3000');
  assert.equal(allowed.status, 200);
});

test('anonymous access to companion and operator features is rejected', async () => {
  for (const path of ['/api/me/dashboard', '/api/checkins', '/api/bookings', '/api/favorites', '/api/notifications', '/api/merchant/dashboard', '/api/admin/overview']) {
    const response = await request(app()).get(path);
    assert.equal(response.status, 401, path);
  }
  assert.equal((await request(app()).post('/api/ai/chat').send({ animalId: 'a'.repeat(24), message: 'hi' })).status, 401);
});

test('forged and wrong-role tokens cannot escalate access', async () => {
  const forged = jwt.sign({ sub: 'a'.repeat(24), role: 'admin', sid: 'b'.repeat(24) }, 'attacker-secret-attacker-secret-attacker', {
    issuer: 'pawcompanion',
    audience: 'pawcompanion',
  });
  assert.equal((await request(app()).get('/api/admin/overview').set('Authorization', `Bearer ${forged}`)).status, 401);

  const user = await customer();
  const session = await login(request.agent(app()), user.email);
  const token = session.body.data.accessToken;
  assert.equal((await request(app()).get('/api/merchant/dashboard').set('Authorization', `Bearer ${token}`)).status, 403);
  assert.equal((await request(app()).get('/api/admin/overview').set('Authorization', `Bearer ${token}`)).status, 403);
});

test('oversized and malformed JSON bodies are rejected', async () => {
  const oversized = await request(app()).post('/api/auth/customer/login').send({ email: 'a@example.com', password: 'x'.repeat(40000) });
  assert.equal(oversized.status, 413);
  const malformed = await request(app()).post('/api/auth/customer/login').set('Content-Type', 'application/json').send('{"email":');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error.code, 'INVALID_JSON');
});

test('NoSQL-shaped inputs are rejected by validation instead of reaching Mongo', async () => {
  const user = await customer();
  const session = await login(request.agent(app()), user.email);
  const token = session.body.data.accessToken;
  const header = { Authorization: `Bearer ${token}` };
  assert.equal((await request(app()).post('/api/bookings').set(header).send({ animalId: { $ne: null }, date: '2026-12-01', startTime: '09:00' })).status, 422);
  assert.equal((await request(app()).post('/api/checkins').set(header).send({ mood: { $gt: 0 } })).status, 422);
  assert.equal((await request(app()).get('/api/animals?species[$ne]=dog')).status, 422);
});

test('uploaded assets are only served for the generated filename shape', async () => {
  assert.equal((await request(app()).get('/uploads/legacy.html')).status, 404);
  assert.equal((await request(app()).get('/uploads/..%2F..%2Fetc%2Fpasswd')).status, 404);
  assert.equal((await request(app()).get('/uploads/000000000000000000000000-00000000-0000-0000-0000-000000000000.jpeg')).status, 404);
});

test('removed prototype endpoints are not silently exposed', async () => {
  assert.equal((await request(app()).post('/api/notification/email').send({})).status, 404);
  assert.equal((await request(app()).post('/api/payment/process').send({})).status, 404);
  assert.equal((await request(app()).get('/api/unknown')).status, 404);
});

test('shared budget outage closes protected routes', async () => {
  const failed = createAppWithFailingBudgets();
  const response = await request(failed).get('/api/animals');
  assert.equal(response.status, 503);
});

function createAppWithFailingBudgets() {
  return createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      JWT_SECRET: 'testing-only-' + 'a'.repeat(64),
      CORS_ORIGIN: 'http://localhost:3000',
      MONGO_URI: 'mongodb://127.0.0.1:27017/test',
      LOG_LEVEL: 'silent',
    }),
    budgets: {
      take: async () => {
        throw new Error('offline');
      },
      close: async () => {},
    },
  });
}

test('production configuration refuses insecure or placeholder settings', () => {
  const base = {
    NODE_ENV: 'production',
    JWT_SECRET: 'a'.repeat(64),
    CORS_ORIGIN: 'https://pawcompanion.example',
    MONGO_URI: 'mongodb://127.0.0.1:27017/paw',
    APP_URL: 'https://pawcompanion.example',
  };
  assert.throws(() => loadConfig(base), /sandbox payments/i);
  assert.throws(
    () => loadConfig({ ...base, ALLOW_SANDBOX_PAYMENTS: 'true', CORS_ORIGIN: 'http://pawcompanion.example' }),
    /HTTPS|CORS_ORIGIN/,
  );
  assert.throws(
    () => loadConfig({ ...base, ALLOW_SANDBOX_PAYMENTS: 'true', JWT_SECRET: 'change-me' }),
    /JWT_SECRET/,
  );
  const valid = loadConfig({ ...base, ALLOW_SANDBOX_PAYMENTS: 'true' });
  assert.equal(valid.production, true);
  assert.equal(valid.paymentsMode, 'sandbox');
});
