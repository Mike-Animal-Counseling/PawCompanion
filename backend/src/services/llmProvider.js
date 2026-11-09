const DEFAULTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  huggingface: 'https://router.huggingface.co/v1/chat/completions',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
};

function configured(provider) {
  return Boolean(provider?.apiKey && provider?.model && provider?.baseUrl);
}

function normalizeProvider(name = '') {
  return String(name || '').trim().toLowerCase();
}

export function resolveChatProvider(config, role = 'primary') {
  const llm = config?.llm || {};
  const provider = role === 'fallback' ? llm.fallback : llm.primary;
  if (!configured(provider)) return null;
  return provider;
}

export function hasChatProvider(config) {
  return Boolean(resolveChatProvider(config) || resolveChatProvider(config, 'fallback'));
}

async function callOpenAiCompatible(provider, messages, { temperature = 0.7, maxTokens = 220 }) {
  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature,
      max_tokens: Math.min(Math.max(Number(maxTokens) || 220, 1), 1024),
    }),
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    const error = new Error('Chat provider unavailable');
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) throw new Error('Empty response from chat provider');
  return String(content).trim();
}

/**
 * Try the primary model, then the fallback model. Provider failures are isolated
 * here so the router can degrade to the deterministic local companion.
 */
export async function completeChat(config, messages, options = {}) {
  const errors = [];
  for (const role of ['primary', 'fallback']) {
    const provider = resolveChatProvider(config, role);
    if (!provider) continue;
    try {
      const model = role === 'primary'
        ? options.model || provider.model
        : options.fallbackModel || provider.model;
      const text = await callOpenAiCompatible(
        { ...provider, model },
        messages,
        { temperature: options.temperature, maxTokens: options.maxTokens },
      );
      return { text, provider: provider.provider || normalizeProvider(role), role };
    } catch (error) {
      errors.push(`${role}:${error.status || error.message}`);
    }
  }
  const error = new Error(`No chat provider succeeded${errors.length ? ` (${errors.join(', ')})` : ''}`);
  error.code = 'CHAT_PROVIDER_UNAVAILABLE';
  throw error;
}

export function providerBaseUrl(providerName) {
  return DEFAULTS[normalizeProvider(providerName)] || '';
}
