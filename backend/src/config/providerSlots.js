/**
 * Provider capability slots.
 *
 * These are contracts, not vendors. A deployment may fill any subset; the
 * local deterministic fallbacks keep working when a slot is empty. Secret
 * values are read only to report configured/missing, never serialized.
 */
export const PROVIDER_SLOTS = Object.freeze({
  chat: {
    label: 'Primary conversation model',
    required: ['LLM_PRIMARY_API_KEY', 'LLM_PRIMARY_MODEL'],
    optional: ['LLM_PRIMARY_PROVIDER', 'LLM_PRIMARY_BASE_URL'],
    fallback: 'deterministic local companion',
  },
  chatFallback: {
    label: 'Secondary conversation model',
    required: ['LLM_FALLBACK_API_KEY', 'LLM_FALLBACK_MODEL'],
    optional: ['LLM_FALLBACK_PROVIDER', 'LLM_FALLBACK_BASE_URL'],
    fallback: 'primary provider, then local companion',
  },
  classifier: {
    label: 'Intent / support-mode classifier',
    required: ['CLASSIFIER_API_KEY', 'CLASSIFIER_MODEL'],
    optional: ['CLASSIFIER_PROVIDER', 'CLASSIFIER_BASE_URL'],
    fallback: 'local intent signals',
  },
  safety: {
    label: 'Safety classifier',
    required: ['SAFETY_API_KEY', 'SAFETY_MODEL'],
    optional: ['SAFETY_PROVIDER', 'SAFETY_BASE_URL'],
    fallback: 'hard local crisis patterns',
  },
  moderation: {
    label: 'Content moderation',
    required: ['MODERATION_API_KEY'],
    optional: ['MODERATION_PROVIDER', 'MODERATION_MODEL'],
    fallback: 'local request/auth validation',
  },
  textEmbedding: {
    label: 'Text memory embeddings',
    required: ['TEXT_EMBEDDING_API_KEY', 'TEXT_EMBEDDING_MODEL'],
    optional: ['TEXT_EMBEDDING_PROVIDER', 'TEXT_EMBEDDING_BASE_URL'],
    fallback: 'recency-based memory',
  },
  audioEmbedding: {
    label: 'Animal-sound embeddings',
    required: ['AUDIO_EMBEDDING_API_KEY', 'AUDIO_EMBEDDING_MODEL'],
    optional: ['AUDIO_EMBEDDING_PROVIDER', 'AUDIO_EMBEDDING_BASE_URL'],
    fallback: 'browser acoustic signature paw-acoustic-v1',
  },
  image: {
    label: 'Companion image generation',
    required: ['IMAGE_API_KEY', 'IMAGE_MODEL'],
    optional: ['IMAGE_PROVIDER', 'IMAGE_BASE_URL'],
    fallback: 'no generated image',
  },
  speechToText: {
    label: 'Server speech-to-text',
    required: ['STT_API_KEY', 'STT_MODEL'],
    optional: ['STT_PROVIDER', 'STT_BASE_URL'],
    fallback: 'browser Web Speech API',
  },
  avatarGeneration: {
    label: '2D avatar art / auto-rig (offline)',
    required: ['AVATAR_GENERATION_API_KEY', 'AVATAR_GENERATION_MODEL'],
    optional: ['AVATAR_GENERATION_PROVIDER', 'AVATAR_GENERATION_BASE_URL'],
    fallback: 'host portrait + CSS motion',
  },
  avatarRuntime: {
    label: 'Rig runtime (usually local)',
    required: ['AVATAR_RUNTIME'],
    optional: [],
    fallback: 'CSS motion',
  },
  vectorStore: {
    label: 'Memory / sound vector index',
    required: ['VECTOR_DB_URL'],
    optional: ['VECTOR_DB_API_KEY', 'VECTOR_DB_COLLECTION'],
    fallback: 'MongoDB fields + recency',
  },
  observability: {
    label: 'LLM tracing / evals',
    required: ['OBSERVABILITY_API_KEY'],
    optional: ['OBSERVABILITY_PROVIDER', 'OBSERVABILITY_PROJECT'],
    fallback: 'structured logs only',
  },
});

function has(env, key) {
  return Boolean(String(env[key] || '').trim());
}

export function providerSlotStatus(env = process.env) {
  return Object.entries(PROVIDER_SLOTS).map(([slot, definition]) => {
    const missing = definition.required.filter((key) => !has(env, key));
    const providerKey = definition.optional.find((key) => key.endsWith('_PROVIDER'));
    const modelKey = definition.required.find((key) => key.endsWith('_MODEL'));
    return {
      slot,
      label: definition.label,
      configured: missing.length === 0,
      provider: providerKey ? String(env[providerKey] || '').trim() || null : null,
      model: modelKey ? String(env[modelKey] || '').trim() || null : null,
      missing,
      fallback: definition.fallback,
    };
  });
}

export function configuredProviderSummary(env = process.env) {
  const slots = providerSlotStatus(env);
  return {
    configured: slots.filter((slot) => slot.configured).map((slot) => slot.slot),
    missing: slots.filter((slot) => !slot.configured).map((slot) => slot.slot),
    slots,
  };
}
