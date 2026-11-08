import test from 'node:test';
import assert from 'node:assert/strict';
import { app, animal, auth, customer, login, merchant, request } from './helpers/setup.js';

async function fixture() {
  const merchantRecord = await merchant();
  const mochi = await animal(merchantRecord, { name: 'Mochi', species: 'cat', price: 42, tags: ['quiet', 'lap cat'] });
  const biscuit = await animal(merchantRecord, { name: 'Biscuit', species: 'dog', breed: 'Golden Retriever', price: 60, tags: ['friendly', 'fetch'] });
  const hidden = await animal(merchantRecord, { name: 'Hidden Cat', species: 'cat', visibility: 'private' });
  return { merchantRecord, mochi, biscuit, hidden };
}

test('public discovery paginates, filters and sorts companions', async () => {
  await fixture();
  const all = await request(app()).get('/api/animals?pageSize=10');
  assert.equal(all.status, 200);
  assert.equal(all.body.meta.total, 2);
  assert.equal(all.body.data.length, 2);

  const dogs = await request(app()).get('/api/animals?species=dog');
  assert.equal(dogs.body.data.length, 1);
  assert.equal(dogs.body.data[0].name, 'Biscuit');

  const search = await request(app()).get('/api/animals?q=golden');
  assert.equal(search.body.data.length, 1);

  const tag = await request(app()).get('/api/animals?tag=quiet');
  assert.equal(tag.body.data.length, 1);
  assert.equal(tag.body.data[0].name, 'Mochi');

  const page = await request(app()).get('/api/animals?pageSize=1&page=2');
  assert.equal(page.body.data.length, 1);
  assert.equal(page.body.meta.totalPages, 2);
  assert.equal(page.body.meta.hasNext, false);

  const sorted = await request(app()).get('/api/animals?sort=price_asc&pageSize=10');
  assert.equal(sorted.body.data[0].name, 'Mochi');
  const sortedDesc = await request(app()).get('/api/animals?sort=price_desc&pageSize=10');
  assert.equal(sortedDesc.body.data[0].name, 'Biscuit');
});

test('facets include species, cities and verified hosts', async () => {
  await fixture();
  const response = await request(app()).get('/api/animals/facets');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.total, 2);
  assert.equal(response.body.data.hosts, 1);
  assert.equal(response.body.data.species.find((item) => item.species === 'cat').count, 1);
  assert.ok(response.body.data.tags.some((tag) => tag.tag === 'quiet'));
  assert.ok(response.body.data.cities.some((city) => city.city === 'Portland'));
});

test('detail includes host, reviews shape, next availability and relationship after auth', async () => {
  const { mochi, merchantRecord } = await fixture();
  const anonymous = await request(app()).get(`/api/animals/${mochi._id}`);
  assert.equal(anonymous.status, 200);
  assert.equal(anonymous.body.data.merchant.name, merchantRecord.name);
  assert.ok(Array.isArray(anonymous.body.data.reviews.recent));
  assert.ok(anonymous.body.data.availability.next);
  assert.equal(anonymous.body.data.relationship, null);

  const user = await customer({ email: `detail-${Date.now()}@example.com` });
  const agent = request.agent(app());
  const session = await login(agent, user.email);
  const token = session.body.data.accessToken;
  const ChatMemory = (await import('../src/models/ChatMemory.js')).default;
  await ChatMemory.create({
    userId: String(user._id),
    animalId: String(mochi._id),
    animalName: 'Mochi',
    messages: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }],
    lastMessageAt: new Date(),
  });
  await request(app()).post(`/api/favorites/${mochi._id}`).set(auth(token));
  const detail = await request(app()).get(`/api/animals/${mochi._id}`).set(auth(token));
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.isFavorite, true);
  assert.equal(detail.body.data.relationship.messages, 2);
  assert.ok(detail.body.data.relationship.level >= 1);
});

test('hidden and malformed animals are not exposed', async () => {
  const { hidden } = await fixture();
  assert.equal((await request(app()).get(`/api/animals/${hidden._id}`)).status, 404);
  assert.equal((await request(app()).get('/api/animals/not-an-object-id')).status, 422);
  assert.equal((await request(app()).get('/api/animals/000000000000000000000000')).status, 404);
});

test('favourites are per customer and can be removed', async () => {
  const { mochi } = await fixture();
  const user = await customer({ email: `fav-${Date.now()}@example.com` });
  const session = await login(request.agent(app()), user.email);
  const token = session.body.data.accessToken;
  assert.equal((await request(app()).post(`/api/favorites/${mochi._id}`).set(auth(token))).status, 200);
  const ids = await request(app()).get('/api/favorites/ids').set(auth(token));
  assert.deepEqual(ids.body.data, [String(mochi._id)]);
  const list = await request(app()).get('/api/favorites').set(auth(token));
  assert.equal(list.body.data[0].name, 'Mochi');
  assert.equal((await request(app()).delete(`/api/favorites/${mochi._id}`).set(auth(token))).status, 200);
  assert.deepEqual((await request(app()).get('/api/favorites/ids').set(auth(token))).body.data, []);
  assert.equal((await request(app()).get('/api/favorites/ids')).status, 401);
});

test('invalid list query values fail validation', async () => {
  assert.equal((await request(app()).get('/api/animals?species=dragon')).status, 422);
  assert.equal((await request(app()).get('/api/animals?minPrice=not-a-number')).status, 422);
  assert.equal((await request(app()).get('/api/animals?pageSize=999')).status, 422);
  assert.equal((await request(app()).get('/api/animals?tag[$ne]=x')).status, 422);
});
