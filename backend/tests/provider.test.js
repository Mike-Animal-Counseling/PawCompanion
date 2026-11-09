import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { completeChat } from '../src/services/llmProvider.js';

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function configFor(primary, fallback = {}) {
  return {
    llm: {
      primary: { provider: 'test', apiKey: 'test-key', model: 'primary-model', ...primary },
      fallback: { provider: 'test', apiKey: 'test-key', model: 'fallback-model', ...fallback },
    },
  };
}

test('the primary provider is used when it succeeds', async () => {
  const server = await startServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: 'primary reply' } }] }));
  });
  try {
    const result = await completeChat(configFor({ baseUrl: `http://127.0.0.1:${server.address().port}/v1/chat/completions` }), [{ role: 'user', content: 'hi' }]);
    assert.equal(result.text, 'primary reply');
    assert.equal(result.role, 'primary');
  } finally {
    server.close();
  }
});

test('the fallback provider is used after a primary failure', async () => {
  const primary = await startServer((_req, res) => {
    res.writeHead(503);
    res.end();
  });
  const fallback = await startServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: 'fallback reply' } }] }));
  });
  try {
    const result = await completeChat(
      configFor(
        { baseUrl: `http://127.0.0.1:${primary.address().port}/v1/chat/completions` },
        { baseUrl: `http://127.0.0.1:${fallback.address().port}/v1/chat/completions` },
      ),
      [{ role: 'user', content: 'hi' }],
    );
    assert.equal(result.text, 'fallback reply');
    assert.equal(result.role, 'fallback');
  } finally {
    primary.close();
    fallback.close();
  }
});

test('an unconfigured provider set fails closed', async () => {
  await assert.rejects(
    () => completeChat({ llm: { primary: {}, fallback: {} } }, [{ role: 'user', content: 'hi' }]),
    /No chat provider succeeded/,
  );
});
