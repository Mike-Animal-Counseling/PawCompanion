import { createHash } from 'node:crypto';
import { logger } from '../lib/logger.js';
import { providerFetch } from './providerFetch.js';

const HF_MODEL = 'sentinet/suicidality';

// Hard triggers run locally and immediately, with no network dependency.
const HIGH_RISK_PATTERNS = [
  /\b(i (really )?want to die|i wanna die)\b/i,
  /\b(kill|killing) myself\b/i,
  /\b(end|ending|take|taking) my (own )?life\b/i,
  /\b(i (do not|don't) want to (live|be alive|wake up))\b/i,
  /\b(no reason to (live|keep going)|better off dead)\b/i,
  /\b(hurt|harm|cut) myself\b/i,
  /\b(suicid(e|al)|self[- ]harm)\b/i,
  /\b(overdose|hang myself|jump off a bridge)\b/i,
  /\b(i (have|made) a plan to (die|kill myself))\b/i,
  /(想死|不想活|自杀|结束(自己的)?生命|伤害自己|轻生)/,
];

// Softer language. These raise a support event (not a crisis interrupt) so the
// assistant can respond with care and the safety team can spot a pattern.
const MEDIUM_RISK_PATTERNS = [
  /\b(hopeless|worthless|hate myself|can't go on|cannot go on)\b/i,
  /\b(nobody (cares|would miss me)|want to disappear)\b/i,
  /\b(tired of (living|being alive)|life (is|feels) pointless)\b/i,
  /(绝望|活着没意思|没人关心|撑不下去|讨厌自己)/,
];

const cache = new Map();
const MAX_CACHE = 300;

export function safetyResources() {
  return [
    { label: 'Call or text 988 (US)', href: 'https://988lifeline.org/', kind: 'phone' },
    { label: 'Find a helpline in your country', href: 'https://findahelpline.com/', kind: 'web' },
    { label: 'Emergency services', href: 'tel:911', kind: 'emergency' },
  ];
}

export function buildCrisisResponse() {
  return {
    type: 'crisis',
    message:
      "I'm really glad you told me. You deserve support from a person right now, not just me.\n\n" +
      'If you are in the US, call or text 988. If you are in immediate danger, call 911. ' +
      'Outside the US, findahelpline.com lists free, confidential services in your country.\n\n' +
      "I'll stay right here. Would you like to tell me what today has felt like?",
    resources: safetyResources(),
  };
}

export const SAFETY_DISCLAIMER =
  'PawCompanion offers companionship, not therapy or medical care. If you are in crisis, contact a local emergency service or helpline.';

function keywordRisk(text) {
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(text)) {
      return { flagged: true, level: 'high', score: 0.95, source: 'keyword' };
    }
  }
  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(text)) {
      return { flagged: false, level: 'medium', score: 0.62, source: 'keyword' };
    }
  }
  return null;
}

function parseClassification(json) {
  let predictions = json;
  if (Array.isArray(predictions) && Array.isArray(predictions[0]) && predictions[0][0]?.label) {
    predictions = predictions[0];
  }
  if (!Array.isArray(predictions) || !predictions[0]?.label || typeof predictions[0]?.score !== 'number') return null;
  return predictions[0];
}

async function classifyWithModel(text, apiKey) {
  if (!apiKey) return null;
  const key = createHash('sha256').update(text).digest('hex');
  if (cache.has(key)) return cache.get(key);

  try {
    const response = await providerFetch(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      },
      512 * 1024,
    );
    const prediction = parseClassification(await response.json());
    if (!prediction) return null;
    const isRisk = String(prediction.label) === 'LABEL_1';
    const score = Number(prediction.score);
    const result =
      isRisk && score >= 0.7
        ? { flagged: score >= 0.85, level: score >= 0.85 ? 'high' : 'medium', score, source: 'model' }
        : { flagged: false, level: 'none', score, source: 'model' };

    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  } catch (error) {
    // Never let a classifier outage turn into a user-visible failure; the
    // keyword layer still runs on every message.
    logger.warn('safety.model_unavailable', { error: error.message });
    return null;
  }
}

/**
 * Analyse a message for self-harm risk. Raw message text is never logged or
 * persisted; only the derived level/score is recorded as a risk event.
 */
export async function detectSelfHarm(text = '', { apiKey = '' } = {}) {
  const clean = String(text || '').trim();
  if (!clean) return { flagged: false, level: 'none', source: 'empty' };

  const keyword = keywordRisk(clean);
  if (keyword?.level === 'high') return keyword;

  const model = await classifyWithModel(clean, apiKey);
  if (model && (model.level !== 'none' || !keyword)) return model;

  return keyword || { flagged: false, level: 'none', source: 'keyword' };
}
