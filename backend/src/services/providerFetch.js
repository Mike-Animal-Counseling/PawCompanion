export async function providerFetch(url, options = {}, maxBytes = 2 * 1024 * 1024) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'router.huggingface.co' || parsed.username || parsed.password) throw new Error('Unsupported provider');
  if (parsed.pathname === '/v1/chat/completions') {
    const body = JSON.parse(options.body);
    body.max_tokens = Math.min(Math.max(Number(body.max_tokens) || 220, 1), 512);
    if (!Array.isArray(body.messages) || body.messages.length > 30 || JSON.stringify(body.messages).length > 100000) throw new Error('Conversation exceeds provider budget');
    options = { ...options, body: JSON.stringify(body) };
  }
  const timeout = AbortSignal.timeout(20000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(url, { ...options, redirect: 'error', signal });
  if (!response.ok) { await response.body?.cancel(); const error = new Error('Provider unavailable'); error.status = response.status; throw error; }
  const chunks = []; let length = 0;
  if (response.body) {
    const reader = response.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        length += value.length;
        if (length > maxBytes) { await reader.cancel(); throw new Error('Provider response too large'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  return new Response(length ? Buffer.concat(chunks) : null, { status: response.status, headers: response.headers });
}
