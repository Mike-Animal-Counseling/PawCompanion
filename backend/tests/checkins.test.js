import test from 'node:test';
import assert from 'node:assert/strict';
import { app, animal, auth, customer, isoDaysFromNow, login, merchant, request } from './helpers/setup.js';

async function signedIn(overrides = {}) {
  const record = await customer(overrides);
  const agent = request.agent(app());
  const session = await login(agent, record.email);
  return { record, agent, token: session.body.data.accessToken };
}

test('a daily check-in creates a reply, streak and history series', async () => {
  const { token } = await signedIn();
  const created = await request(app())
    .post('/api/checkins')
    .set(auth(token))
    .send({ mood: 2, energy: 2, note: 'Long day and I am being hard on myself.', tags: ['tired', 'overwhelmed'] });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.checkin.mode, 'support');
  assert.ok(created.body.data.checkin.aiReply.length > 20);
  assert.equal(created.body.data.streak, 1);

  const today = await request(app()).get('/api/checkins/today').set(auth(token));
  assert.equal(today.status, 200);
  assert.equal(today.body.data.checkin.mood, 2);

  const history = await request(app()).get('/api/checkins?days=7').set(auth(token));
  assert.equal(history.status, 200);
  assert.equal(history.body.data.checkedIn, 1);
  assert.equal(history.body.data.series.length, 7);
  assert.equal(history.body.data.series.at(-1).checkedIn, true);

  const updated = await request(app()).post('/api/checkins').set(auth(token)).send({ mood: 4, energy: 4, tags: ['good'] });
  assert.equal(updated.status, 201);
  assert.equal(updated.body.data.checkin.mood, 4);
  assert.equal(updated.body.data.streak, 1);
  const historyAfter = await request(app()).get('/api/checkins?days=7').set(auth(token));
  assert.equal(historyAfter.body.data.checkedIn, 1);
});

test('check-in notes are screened and crisis resources are returned', async () => {
  const { token } = await signedIn();
  const response = await request(app())
    .post('/api/checkins')
    .set(auth(token))
    .send({ mood: 1, energy: 1, note: 'I want to die and I have a plan.', tags: ['overwhelmed'] });
  assert.equal(response.status, 201);
  assert.equal(response.body.data.safety.flagged, true);
  assert.ok(response.body.data.safety.resources.length >= 2);
  assert.match(response.body.data.checkin.aiReply, /988|helpline|crisis/i);
  assert.equal(response.body.data.checkin.safetyLevel, 'high');

  const risk = await request(app()).get('/api/ai/safety').set(auth(token));
  assert.equal(risk.status, 200);
  assert.ok(risk.body.data.profile.events7d >= 1);
});

test('dashboard combines check-in, chats, favourites, visits and recommendations', async () => {
  const merchantRecord = await merchant();
  const animalRecord = await animal(merchantRecord, { name: 'Mochi', species: 'cat' });
  const { record, token } = await signedIn();
  const ChatMemory = (await import('../src/models/ChatMemory.js')).default;
  const Favorite = (await import('../src/models/Favorite.js')).default;
  const Booking = (await import('../src/models/Booking.js')).default;

  await ChatMemory.create({
    userId: String(record._id),
    animalId: String(animalRecord._id),
    animalName: 'Mochi',
    chatMode: 'support',
    messages: [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'I am here.' }],
    lastMessageAt: new Date(),
  });
  await Favorite.create({ customerId: record._id, animalId: animalRecord._id });
  const booking = await request(app())
    .post('/api/bookings')
    .set(auth(token))
    .send({
      animalId: animalRecord._id,
      serviceType: 'cafe_meet',
      date: isoDaysFromNow(2),
      startTime: '09:00',
      contact: { name: 'Maya', email: 'maya@example.com', phone: '+1 503 555 0142', address: '', city: 'Portland', notes: '' },
      acceptTerms: true,
    });
  assert.equal(booking.status, 201);

  await request(app()).post('/api/checkins').set(auth(token)).send({ mood: 4, energy: 3, tags: ['good'] });

  const dashboard = await request(app()).get('/api/me/dashboard').set(auth(token));
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.data.checkin.today.mood, 4);
  assert.equal(dashboard.body.data.checkin.streak, 1);
  assert.equal(dashboard.body.data.activeChats.length, 1);
  assert.equal(dashboard.body.data.activeChats[0].animalName, 'Mochi');
  assert.equal(dashboard.body.data.favorites[0].name, 'Mochi');
  assert.equal(dashboard.body.data.nextVisit.service.mode, 'in_person');
  assert.ok(dashboard.body.data.recommended.length >= 1);
  assert.ok(dashboard.body.data.stats.messages >= 2);

  const bonds = await request(app()).get('/api/me/companions').set(auth(token));
  assert.equal(bonds.status, 200);
  assert.equal(bonds.body.data[0].name, 'Mochi');
  assert.ok(bonds.body.data[0].relationship.points > 0);

  await Booking.deleteMany({});
});

test('check-ins can be deleted and are included in companion data deletion', async () => {
  const { token } = await signedIn();
  await request(app()).post('/api/checkins').set(auth(token)).send({ mood: 3, energy: 3 });
  const history = await request(app()).get('/api/checkins?days=7').set(auth(token));
  const id = history.body.data.items[0].id;
  const deleted = await request(app()).delete(`/api/checkins/${id}`).set(auth(token));
  assert.equal(deleted.status, 200);
  assert.equal((await request(app()).get('/api/checkins?days=7').set(auth(token))).body.data.checkedIn, 0);

  await request(app()).post('/api/checkins').set(auth(token)).send({ mood: 3, energy: 3 });
  const wiped = await request(app()).delete('/api/ai/data').set(auth(token));
  assert.equal(wiped.status, 200);
  assert.equal(wiped.body.data.checkinsDeleted, 1);
});

test('check-in validation rejects malformed moods and objects', async () => {
  const { token } = await signedIn();
  for (const body of [{ mood: 0 }, { mood: 6 }, { mood: '3' }, { mood: { $gt: 0 } }, { mood: 3, energy: 9 }, { mood: 3, tags: ['unknown'] }]) {
    const response = await request(app()).post('/api/checkins').set(auth(token)).send(body);
    assert.equal(response.status, 422, JSON.stringify(body));
  }
});
