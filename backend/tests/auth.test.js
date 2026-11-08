import test from 'node:test';
import assert from 'node:assert/strict';
import { app, customer, merchant, admin, login, auth, request, PASSWORD, ADMIN_PASSWORD } from './helpers/setup.js';

const api = () => request(app());

test('customer registration issues a session, access token and refresh cookie', async () => {
  const agent = request.agent(app());
  const response = await agent.post('/api/auth/customer/register').send({
    name: 'New Guest',
    email: 'new-guest@example.com',
    password: PASSWORD,
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.user.role, 'customer');
  assert.ok(response.body.data.accessToken);
  assert.match(response.headers['set-cookie'].join(';'), /pc_refresh=/);
  const me = await agent.get('/api/auth/me').set(auth(response.body.data.accessToken));
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.email, 'new-guest@example.com');
});

test('registration rejects duplicates and weak or malformed input', async () => {
  await customer({ email: 'duplicate@example.com' });
  const duplicate = await api().post('/api/auth/customer/register').send({ name: 'Other', email: 'duplicate@example.com', password: PASSWORD });
  assert.equal(duplicate.status, 409);
  const weak = await api().post('/api/auth/customer/register').send({ name: 'Other', email: 'other@example.com', password: 'short' });
  assert.equal(weak.status, 422);
  const objectEmail = await api().post('/api/auth/customer/register').send({ name: 'Other', email: { $ne: null }, password: PASSWORD });
  assert.equal(objectEmail.status, 422);
});

test('login rotates refresh sessions and invalidates the previous access token on refresh', async () => {
  const user = await customer({ email: 'rotate@example.com' });
  const agent = request.agent(app());
  const loginResponse = await login(agent, user.email);
  assert.equal(loginResponse.status, 200);
  const firstToken = loginResponse.body.data.accessToken;

  const refresh = await agent.post('/api/auth/refresh');
  assert.equal(refresh.status, 200);
  const secondToken = refresh.body.data.accessToken;
  assert.notEqual(firstToken, secondToken);

  const oldToken = await api().get('/api/auth/me').set(auth(firstToken));
  assert.equal(oldToken.status, 401);
  const newToken = await api().get('/api/auth/me').set(auth(secondToken));
  assert.equal(newToken.status, 200);
});

test('wrong passwords and suspended accounts fail with a generic 401', async () => {
  const user = await customer({ email: 'login@example.com' });
  assert.equal((await api().post('/api/auth/customer/login').send({ email: user.email, password: 'wrong-password' })).status, 401);
  const suspended = await customer({ email: 'suspended@example.com', status: 'suspended' });
  assert.equal((await api().post('/api/auth/customer/login').send({ email: suspended.email, password: PASSWORD })).status, 401);
  assert.equal((await api().post('/api/auth/customer/login').send({ email: 'nobody@example.com', password: PASSWORD })).status, 401);
});

test('logout revokes the refresh cookie and the current access session', async () => {
  const user = await customer({ email: 'logout@example.com' });
  const agent = request.agent(app());
  const loginResponse = await login(agent, user.email);
  const token = loginResponse.body.data.accessToken;
  const logout = await agent.post('/api/auth/logout').set(auth(token));
  assert.equal(logout.status, 204);
  assert.equal((await agent.post('/api/auth/refresh')).status, 401);
  assert.equal((await api().get('/api/auth/me').set(auth(token))).status, 401);
});

test('password changes require the current password and revoke other sessions', async () => {
  const user = await customer({ email: 'password@example.com' });
  const agent = request.agent(app());
  const first = await login(agent, user.email);
  const firstToken = first.body.data.accessToken;

  const secondAgent = request.agent(app());
  const second = await login(secondAgent, user.email);
  const secondToken = second.body.data.accessToken;

  const wrong = await api().post('/api/auth/password').set(auth(firstToken)).send({ currentPassword: 'nope-nope-nope', newPassword: 'BrandNewPassword!2026' });
  assert.equal(wrong.status, 401);

  const changed = await api().post('/api/auth/password').set(auth(firstToken)).send({ currentPassword: PASSWORD, newPassword: 'BrandNewPassword!2026' });
  assert.equal(changed.status, 200);
  assert.equal((await api().get('/api/auth/me').set(auth(secondToken))).status, 401);

  assert.equal((await api().post('/api/auth/customer/login').send({ email: user.email, password: PASSWORD })).status, 401);
  assert.equal((await api().post('/api/auth/customer/login').send({ email: user.email, password: 'BrandNewPassword!2026' })).status, 200);
});

test('profile preferences can be updated and are returned on /me', async () => {
  const user = await customer({ email: 'preferences@example.com' });
  const agent = request.agent(app());
  const session = await login(agent, user.email);
  const token = session.body.data.accessToken;

  const updated = await api()
    .patch('/api/auth/me')
    .set(auth(token))
    .send({ goals: ['calm', 'support'], preferredSpecies: 'cat', onboardingComplete: true, name: 'Maya Updated' });
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body.data.user.goals, ['calm', 'support']);
  assert.equal(updated.body.data.user.preferredSpecies, 'cat');
  assert.equal(updated.body.data.user.name, 'Maya Updated');
});

test('roles cannot access each other consoles', async () => {
  const user = await customer({ email: 'roles@example.com' });
  const merchantRecord = await merchant();
  const customerAgent = request.agent(app());
  const customerSession = await login(customerAgent, user.email);
  const customerToken = customerSession.body.data.accessToken;
  assert.equal((await api().get('/api/merchant/dashboard').set(auth(customerToken))).status, 403);
  assert.equal((await api().get('/api/admin/overview').set(auth(customerToken))).status, 403);

  const merchantAgent = request.agent(app());
  const merchantSession = await login(merchantAgent, merchantRecord.email, undefined, 'merchant');
  const merchantToken = merchantSession.body.data.accessToken;
  assert.equal((await api().get('/api/me/dashboard').set(auth(merchantToken))).status, 403);
  assert.equal((await api().get('/api/admin/overview').set(auth(merchantToken))).status, 403);
});

test('admin login and operator-only endpoints work', async () => {
  const adminRecord = await admin();
  const agent = request.agent(app());
  const session = await login(agent, adminRecord.email, ADMIN_PASSWORD, 'admin');
  assert.equal(session.status, 200);
  assert.equal(session.body.data.user.role, 'admin');
  const overview = await api().get('/api/admin/overview').set(auth(session.body.data.accessToken));
  assert.equal(overview.status, 200);
  assert.equal(overview.body.data.customers.total, 0);
});

test('session listing reports the current device and revoke works', async () => {
  const user = await customer({ email: 'sessions@example.com' });
  const agent = request.agent(app());
  const session = await login(agent, user.email);
  const token = session.body.data.accessToken;
  const list = await api().get('/api/auth/sessions').set(auth(token));
  assert.equal(list.status, 200);
  assert.equal(list.body.data.sessions.length, 1);
  assert.equal(list.body.data.sessions[0].current, true);
  const revoked = await api().delete(`/api/auth/sessions/${list.body.data.sessions[0].id}`).set(auth(token));
  assert.equal(revoked.status, 204);
});
