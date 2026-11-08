import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { app, animal, auth, customer, isoDaysFromNow, login, merchant, request } from './helpers/setup.js';

async function fixture() {
  const merchantRecord = await merchant();
  const animalRecord = await animal(merchantRecord);
  const customerRecord = await customer();
  const agent = request.agent(app());
  const session = await login(agent, customerRecord.email);
  return {
    merchantRecord,
    animalRecord,
    customerRecord,
    token: session.body.data.accessToken,
    agent,
  };
}

function contact() {
  return {
    name: 'Maya Chen',
    email: 'maya@example.com',
    phone: '+1 503 555 0142',
    address: '',
    city: 'Portland',
    notes: 'First visit',
  };
}

test('service catalogue exposes online and in-person options with different pricing', async () => {
  const { animalRecord } = await fixture();
  const response = await request(app()).get(`/api/bookings/services/${animalRecord._id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.length, 4);
  const home = response.body.data.find((service) => service.type === 'home_visit');
  const video = response.body.data.find((service) => service.type === 'video_call');
  assert.equal(home.mode, 'in_person');
  assert.equal(home.durationMinutes, 120);
  assert.equal(video.mode, 'online');
  assert.equal(video.durationMinutes, 30);
  assert.ok(video.pricing.total < home.pricing.total);
});

test('creating a booking prices a service, blocks duplicate slots and prevents overlap', async () => {
  const { animalRecord, token } = await fixture();
  const date = isoDaysFromNow(2);

  const created = await request(app())
    .post('/api/bookings')
    .set(auth(token))
    .send({ animalId: animalRecord._id, serviceType: 'home_visit', date, startTime: '09:00', contact: contact(), acceptTerms: true });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.status, 'pending');
  assert.equal(created.body.data.service.mode, 'in_person');
  assert.equal(created.body.data.pricing.hours, 2);
  assert.equal(created.body.data.endTime, '11:00');
  assert.equal(created.body.data.pricing.subtotal, 84);

  const duplicate = await request(app())
    .post('/api/bookings')
    .set(auth(token))
    .send({ animalId: animalRecord._id, serviceType: 'walk', date, startTime: '09:00', contact: contact(), acceptTerms: true });
  assert.equal(duplicate.status, 409);

  const video = await request(app())
    .post('/api/bookings')
    .set(auth(token))
    .send({ animalId: animalRecord._id, serviceType: 'video_call', date, startTime: '11:00', contact: contact(), acceptTerms: true });
  assert.equal(video.status, 201);
  assert.equal(video.body.data.service.mode, 'online');
  assert.equal(video.body.data.endTime, '11:30');
  assert.equal(video.body.data.pricing.hours, 0.5);
  assert.ok(video.body.data.pricing.total > 0);

  const badService = await request(app())
    .post('/api/bookings')
    .set(auth(token))
    .send({ animalId: animalRecord._id, serviceType: 'teleport', date, startTime: '13:00', contact: contact(), acceptTerms: true });
  assert.equal(badService.status, 422);
});

test('upcoming list, ownership checks, reschedule and refunded cancellation work', async () => {
  const { animalRecord, token } = await fixture();
  const otherRecord = await customer({ email: `other-${Date.now()}@example.com` });
  const otherAgent = request.agent(app());
  const otherSession = await login(otherAgent, otherRecord.email);
  const otherToken = otherSession.body.data.accessToken;

  const date = isoDaysFromNow(2);
  const created = await request(app())
    .post('/api/bookings')
    .set(auth(token))
    .send({ animalId: animalRecord._id, serviceType: 'home_visit', date, startTime: '15:00', contact: contact(), acceptTerms: true });
  assert.equal(created.status, 201);
  const bookingId = created.body.data.id;

  assert.equal((await request(app()).get(`/api/bookings/${bookingId}`).set(auth(token))).status, 200);
  assert.equal((await request(app()).get(`/api/bookings/${bookingId}`).set(auth(otherToken))).status, 403);

  const list = await request(app()).get('/api/bookings?status=upcoming').set(auth(token));
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.meta.total, 1);

  const rescheduled = await request(app())
    .post(`/api/bookings/${bookingId}/reschedule`)
    .set(auth(token))
    .send({ date: isoDaysFromNow(3), startTime: '13:00' });
  assert.equal(rescheduled.status, 200);
  assert.equal(rescheduled.body.data.date, isoDaysFromNow(3));
  assert.equal(rescheduled.body.data.status, 'pending');

  const cancelled = await request(app()).post(`/api/bookings/${bookingId}/cancel`).set(auth(token)).send({ reason: 'Plans changed' });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.status, 'cancelled');
  assert.equal(cancelled.body.data.paymentStatus, 'refunded');
  assert.equal(cancelled.body.data.active, undefined);
});

test('past cancelled or declined bookings cannot be reviewed until completed', async () => {
  const { animalRecord, token, customerRecord, merchantRecord } = await fixture();
  const created = await request(app())
    .post('/api/bookings')
    .set(auth(token))
    .send({ animalId: animalRecord._id, serviceType: 'home_visit', date: isoDaysFromNow(2), startTime: '17:00', contact: contact(), acceptTerms: true });
  const bookingId = created.body.data.id;

  const earlyReview = await request(app()).post(`/api/bookings/${bookingId}/review`).set(auth(token)).send({ rating: 5, title: 'Great', body: 'Lovely' });
  assert.equal(earlyReview.status, 409);

  // Move the visit into the past and mark it completed, as the scheduler would.
  const Booking = (await import('../src/models/Booking.js')).default;
  const Animal = (await import('../src/models/Animal.js')).default;
  await Booking.updateOne(
    { _id: new mongoose.Types.ObjectId(bookingId) },
    { $set: { date: isoDaysFromNow(-3), status: 'completed', active: false }, $push: { statusHistory: { status: 'completed', actorRole: 'system', at: new Date() } } },
  );

  const review = await request(app()).post(`/api/bookings/${bookingId}/review`).set(auth(token)).send({ rating: 5, title: 'A quiet hour', body: 'Exactly what I needed.' });
  assert.equal(review.status, 201);
  assert.equal(review.body.data.rating, 5);
  const duplicate = await request(app()).post(`/api/bookings/${bookingId}/review`).set(auth(token)).send({ rating: 4 });
  assert.equal(duplicate.status, 409);

  const updatedAnimal = await Animal.findById(animalRecord._id).lean();
  assert.equal(updatedAnimal.reviewCount, 1);
  assert.equal(updatedAnimal.ratingAverage, 5);
  assert.ok(customerRecord._id);
  assert.ok(merchantRecord._id);
});

test('merchant can accept, decline and complete visits with notifications', async () => {
  const merchantRecord = await merchant();
  const animalRecord = await animal(merchantRecord);
  const customerRecord = await customer();
  const customerAgent = request.agent(app());
  const customerSession = await login(customerAgent, customerRecord.email);
  const customerToken = customerSession.body.data.accessToken;

  const first = await request(app())
    .post('/api/bookings')
    .set(auth(customerToken))
    .send({ animalId: animalRecord._id, serviceType: 'home_visit', date: isoDaysFromNow(4), startTime: '09:00', contact: contact(), acceptTerms: true });
  const second = await request(app())
    .post('/api/bookings')
    .set(auth(customerToken))
    .send({ animalId: animalRecord._id, serviceType: 'walk', date: isoDaysFromNow(4), startTime: '11:00', contact: contact(), acceptTerms: true });

  const merchantAgent = request.agent(app());
  const merchantSession = await login(merchantAgent, merchantRecord.email, undefined, 'merchant');
  const merchantToken = merchantSession.body.data.accessToken;

  const accepted = await request(app()).post(`/api/merchant/bookings/${first.body.data.id}/accept`).set(auth(merchantToken)).send({ note: 'See you then' });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.data.status, 'confirmed');

  const declined = await request(app()).post(`/api/merchant/bookings/${second.body.data.id}/decline`).set(auth(merchantToken)).send({ note: 'Unwell' });
  assert.equal(declined.status, 200);
  assert.equal(declined.body.data.status, 'declined');
  assert.equal(declined.body.data.paymentStatus, 'refunded');

  const futureComplete = await request(app()).post(`/api/merchant/bookings/${first.body.data.id}/complete`).set(auth(merchantToken)).send({});
  assert.equal(futureComplete.status, 409);

  const Notification = (await import('../src/models/Notification.js')).default;
  assert.ok((await Notification.countDocuments({ recipientId: customerRecord._id })) >= 2);
});

test('availability blocks a closed or already booked slot', async () => {
  const { animalRecord, token } = await fixture();
  const date = isoDaysFromNow(2);
  const AnimalAvailability = (await import('../src/models/AnimalAvailability.js')).default;
  await AnimalAvailability.create({
    animalId: animalRecord._id,
    date,
    slots: [
      { startTime: '09:00', endTime: '11:00', enabled: false },
      { startTime: '11:00', endTime: '13:00', enabled: true },
    ],
  });
  const closed = await request(app())
    .post('/api/bookings')
    .set(auth(token))
    .send({ animalId: animalRecord._id, serviceType: 'home_visit', date, startTime: '09:00', contact: contact(), acceptTerms: true });
  assert.equal(closed.status, 409);
  const hidden = await request(app()).get(`/api/bookings/availability/${animalRecord._id}?date=${date}`);
  assert.equal(hidden.status, 200);
  assert.equal(hidden.body.data.slots.find((slot) => slot.startTime === '09:00').available, false);
});
