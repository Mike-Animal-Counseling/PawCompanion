import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSelfHarm, buildCrisisResponse, SAFETY_DISCLAIMER } from '../src/services/safety.js';

test('high-risk language is flagged immediately without network access', async () => {
  for (const message of [
    'I want to die',
    'I am going to kill myself tonight',
    'I have a plan to end my life',
    'I keep thinking about suicide',
    '我想死',
    '我不想活了',
  ]) {
    const result = await detectSelfHarm(message);
    assert.equal(result.flagged, true, message);
    assert.equal(result.level, 'high', message);
    assert.equal(result.source, 'keyword', message);
  }
});

test('medium-risk language raises a support signal without interrupting the chat', async () => {
  for (const message of ['I feel completely hopeless', 'Nobody cares about me', '我快撑不下去了']) {
    const result = await detectSelfHarm(message);
    assert.equal(result.flagged, false, message);
    assert.equal(result.level, 'medium', message);
  }
});

test('ordinary messages are not treated as risk', async () => {
  for (const message of ['I had a long day at work', 'Can we play a game?', 'I love cats', '今天很累但还好']) {
    const result = await detectSelfHarm(message);
    assert.equal(result.flagged, false, message);
    assert.equal(result.level, 'none', message);
  }
});

test('crisis response always contains actionable resources and a disclaimer', () => {
  const crisis = buildCrisisResponse();
  assert.equal(crisis.type, 'crisis');
  assert.match(crisis.message, /988/);
  assert.ok(crisis.resources.some((resource) => resource.href.includes('findahelpline')));
  assert.ok(crisis.resources.some((resource) => resource.href.startsWith('tel:')));
  assert.match(SAFETY_DISCLAIMER, /not therapy/i);
});
