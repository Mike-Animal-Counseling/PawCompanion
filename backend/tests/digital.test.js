import test from 'node:test';
import assert from 'node:assert/strict';
import { app, animal, auth, customer, login, merchant, request } from './helpers/setup.js';

async function fixture() {
  const merchantRecord = await merchant();
  const animalRecord = await animal(merchantRecord, {
    digital: {
      voice: 'cat',
      traits: { energy: 2, sociability: 3, curiosity: 4, anxiety: 3, playfulness: 4 },
      routines: ['window watch'],
      favorites: ['sunbeam'],
      comforts: ['slow blink'],
      voiceStyle: 'soft, dry, unhurried',
    },
  });
  const customerRecord = await customer();
  const agent = request.agent(app());
  const session = await login(agent, customerRecord.email);
  return { animalRecord, customerRecord, token: session.body.data.accessToken, agent };
}

test('digital companion returns state, behaviour and a species sound', async () => {
  const { animalRecord, token } = await fixture();
  const response = await request(app())
    .post('/api/ai/chat')
    .set(auth(token))
    .send({ animalId: animalRecord._id, message: 'Hi, I just got home.' });

  assert.equal(response.status, 200);
  const digital = response.body.data.digital;
  assert.ok(digital);
  assert.equal(digital.sound.url.startsWith('/sounds/'), true);
  assert.equal(digital.state.interactions, 1);
  assert.ok(digital.behaviour);
  assert.ok(digital.animation);
  assert.equal(response.body.data.meta.provider, 'local');

  const conversation = await request(app())
    .get(`/api/ai/conversations/${animalRecord._id}`)
    .set(auth(token));
  assert.equal(conversation.status, 200);
  assert.equal(conversation.body.data.digital.voice, 'cat');
  assert.equal(conversation.body.data.digital.state.interactions, 1);
  assert.equal(conversation.body.data.animal.species, 'cat');
});

test('support turns use the gentle body and keep state across turns', async () => {
  const { animalRecord, token } = await fixture();
  const first = await request(app())
    .post('/api/ai/chat')
    .set(auth(token))
    .send({ animalId: animalRecord._id, message: 'I had a really rough day.' });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.digital.mood, 'gentle');
  assert.equal(first.body.data.digital.sound.label.includes('purr'), true);

  const second = await request(app())
    .post('/api/ai/chat')
    .set(auth(token))
    .send({ animalId: animalRecord._id, message: 'I feel hopeless and alone.' });
  assert.equal(second.status, 200);
  assert.equal(second.body.data.routeMeta.mode, 'support');
  assert.equal(second.body.data.digital.mood, 'gentle');
  assert.equal(second.body.data.digital.state.interactions, 2);
});

test('the host can edit the digital profile and it drives the digital state', async () => {
  const merchantRecord = await merchant();
  const animalRecord = await animal(merchantRecord);
  const partnerAgent = request.agent(app());
  const partnerSession = await login(partnerAgent, merchantRecord.email, undefined, 'merchant');

  const updated = await request(app())
    .patch(`/api/merchant/animals/${animalRecord._id}`)
    .set(auth(partnerSession.body.data.accessToken))
    .send({
      digital: {
        enabled: true,
        voice: 'cat',
        traits: { energy: 1, sociability: 2, curiosity: 3, anxiety: 5, playfulness: 2 },
        routines: ['window watch'],
        favorites: ['sunbeam'],
        comforts: ['slow blink'],
        boundaries: ['no grabbing'],
        hostNotes: 'Startles at the vacuum. Warms up after a quiet minute.',
        voiceStyle: 'Small, dry, close.',
      },
    });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.digital.traits.anxiety, 5);
  assert.equal(updated.body.data.digital.hostNotes, 'Startles at the vacuum. Warms up after a quiet minute.');
});

test('a companion can opt out of the digital self', async () => {
  const merchantRecord = await merchant();
  const animalRecord = await animal(merchantRecord, { digital: { enabled: false } });
  const customerRecord = await customer();
  const agent = request.agent(app());
  const session = await login(agent, customerRecord.email);

  const response = await request(app())
    .post('/api/ai/chat')
    .set(auth(session.body.data.accessToken))
    .send({ animalId: animalRecord._id, message: 'Hello' });
  assert.equal(response.status, 409);
});
