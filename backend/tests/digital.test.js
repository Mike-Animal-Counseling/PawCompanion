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

function wavBuffer(seconds = 1, sampleRate = 8000) {
  const samples = Math.floor(seconds * sampleRate);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i += 1) {
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 4000), 44 + i * 2);
  }
  return buffer;
}

test('the host can upload and remove a sound with an acoustic signature', async () => {
  const merchantRecord = await merchant();
  const animalRecord = await animal(merchantRecord);
  const partnerAgent = request.agent(app());
  const partnerSession = await login(partnerAgent, merchantRecord.email, undefined, 'merchant');
  const token = partnerSession.body.data.accessToken;

  const upload = await request(app())
    .post(`/api/merchant/animals/${animalRecord._id}/sounds`)
    .set(auth(token))
    .field('label', 'Soft hello')
    .field('mood', 'gentle')
    .field('behaviour', 'settle nearby')
    .field('embedding', JSON.stringify([0.1, 0.2, 0.3]))
    .attach('audio', wavBuffer(1), { filename: 'hello.wav', contentType: 'audio/wav' });

  assert.equal(upload.status, 201);
  assert.equal(upload.body.data.analysis.status, 'signature');
  assert.equal(upload.body.data.durationMs, 1000);
  assert.match(upload.body.data.url, /^\/uploads\/[a-f\d]{24}-[a-f\d-]{36}\.wav$/);

  const list = await request(app())
    .get(`/api/merchant/animals/${animalRecord._id}/sounds`)
    .set(auth(token));
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);

  const removed = await request(app())
    .delete(`/api/merchant/sounds/${upload.body.data.id}`)
    .set(auth(token));
  assert.equal(removed.status, 204);
});

test('the host can generate a digital profile draft from listing copy', async () => {
  const merchantRecord = await merchant();
  const animalRecord = await animal(merchantRecord, {
    description: 'A shy cat who loves the window, slow blinks and quiet afternoons. Startles at loud noises.',
    personality: 'Quiet, curious, affectionate once settled.',
  });
  const partnerAgent = request.agent(app());
  const partnerSession = await login(partnerAgent, merchantRecord.email, undefined, 'merchant');

  const response = await request(app())
    .post(`/api/merchant/animals/${animalRecord._id}/digital/draft`)
    .set(auth(partnerSession.body.data.accessToken));
  assert.equal(response.status, 200);
  assert.ok(response.body.data.traits.anxiety >= 2);
  assert.ok(response.body.data.routines.includes('window watch'));
  assert.match(response.body.data.hostNotes, /quiet/i);
  assert.equal(response.body.data.draft, true);
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
