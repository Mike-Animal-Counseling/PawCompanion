import { completeChat } from './llmProvider.js';

const DEFAULT_TRAITS = { energy: 3, sociability: 3, curiosity: 3, anxiety: 2, playfulness: 3 };

function clampTrait(value) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(5, Math.max(1, number)) : 3;
}

function stringList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
    : [];
}

function parseJson(text) {
  const raw = String(text || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model did not return a profile object');
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * Model-first onboarding extraction. The result is still a draft: the host
 * reviews every field before saving. No keyword scoring is used here.
 */
export async function draftDigitalProfileWithModel({ animal, config }) {
  const source = [animal.personality, animal.description, ...(animal.tags || [])].filter(Boolean).join(' ');
  const result = await completeChat(
    config,
    [
      {
        role: 'system',
        content: `You extract a digital-pet profile for a pet companionship product. Return ONLY JSON with:
{"voice":"cat|dog|rabbit|other","traits":{"energy":1-5,"sociability":1-5,"curiosity":1-5,"anxiety":1-5,"playfulness":1-5},"routines":["..."],"favorites":["..."],"comforts":["..."],"boundaries":["..."],"hostNotes":"<=1000 chars","voiceStyle":"<=200 chars"}
Do not invent medical facts. Do not claim to know the animal personally. Use only the supplied profile copy. Keep lists to 4-8 short phrases. If a dimension is not supported, use 3; anxiety defaults to 2. voice must match the species when it is cat/dog/rabbit, otherwise "other".`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          name: animal.name,
          species: animal.species,
          breed: animal.breed || '',
          ageMonths: animal.ageMonths,
          energyLevel: animal.energyLevel,
          personality: animal.personality || '',
          description: animal.description || '',
          tags: animal.tags || [],
        }).slice(0, 8000),
      },
    ],
    { temperature: 0.2, maxTokens: 500 },
  );
  const parsed = parseJson(result.text);
  const traits = parsed.traits && typeof parsed.traits === 'object' ? parsed.traits : {};
  return {
    enabled: true,
    voice: ['cat', 'dog', 'rabbit'].includes(parsed.voice) ? parsed.voice : (['cat', 'dog', 'rabbit'].includes(animal.species) ? animal.species : 'other'),
    traits: {
      energy: clampTrait(traits.energy ?? animal.energyLevel ?? DEFAULT_TRAITS.energy),
      sociability: clampTrait(traits.sociability ?? DEFAULT_TRAITS.sociability),
      curiosity: clampTrait(traits.curiosity ?? DEFAULT_TRAITS.curiosity),
      anxiety: clampTrait(traits.anxiety ?? DEFAULT_TRAITS.anxiety),
      playfulness: clampTrait(traits.playfulness ?? DEFAULT_TRAITS.playfulness),
    },
    routines: stringList(parsed.routines),
    favorites: stringList(parsed.favorites),
    comforts: stringList(parsed.comforts),
    boundaries: stringList(parsed.boundaries),
    hostNotes: String(parsed.hostNotes || source).slice(0, 1000),
    voiceStyle: String(parsed.voiceStyle || animal.personality || '').slice(0, 200),
    soundPack: 'species',
    draft: true,
    confidence: 'model',
  };
}

function score(text, patterns, base = 3) {
  const matches = patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  return Math.max(1, Math.min(5, base + matches));
}

function list(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * A deterministic first draft for host onboarding. It is deliberately labelled
 * as a draft: the host reviews the traits before the listing is published.
 * A semantic provider can replace this later without changing the API shape.
 */
export function draftDigitalProfile(source = {}) {
  const text = [source.personality, source.description, ...(source.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const species = ['cat', 'dog', 'rabbit'].includes(source.species) ? source.species : 'other';
  const traits = {
    energy: score(text, [/sleep|nap|slow|calm|quiet|cozy/, /run|walk|active|zoom|play/], source.energyLevel || 3),
    sociability: score(text, [/friendly|social|lap|affectionate|cuddle|people/, /shy|hides|slow to warm|independent/], 3),
    curiosity: score(text, [/curious|explore|investigate|window|sniff|puzzle/], 3),
    anxiety: score(text, [/anxious|scared|nervous|shy|startle|loud|hides/], 2),
    playfulness: score(text, [/play|toy|chase|fetch|string|pounce|mischief/], 3),
  };
  const routines = [];
  if (/morning/.test(text)) routines.push('morning routine');
  if (/window/.test(text)) routines.push('window watch');
  if (/nap|sleep/.test(text)) routines.push('afternoon nap');
  if (/walk/.test(text)) routines.push('daily walk');
  if (/night|evening/.test(text)) routines.push('evening wind-down');
  const favorites = list(source.tags).slice(0, 4);
  if (/sunbeam|sun/.test(text)) favorites.push('sunbeam');
  if (/box|toy|string/.test(text)) favorites.push('favourite toy');
  const comforts = [];
  if (/slow blink|quiet|gentle/.test(text)) comforts.push('slow blink');
  if (/lap|cuddle|close/.test(text)) comforts.push('close company');
  if (/blanket|bed/.test(text)) comforts.push('a familiar blanket');
  const boundaries = [];
  if (/loud|noise/.test(text)) boundaries.push('no loud crowds');
  if (/grab|pick up|hold/.test(text)) boundaries.push('no grabbing');
  if (/other animals|dog|cat/.test(text)) boundaries.push('slow introductions');

  return {
    enabled: true,
    voice: species,
    traits,
    routines: routines.slice(0, 8),
    favorites: [...new Set(favorites)].slice(0, 8),
    comforts: [...new Set(comforts)].slice(0, 8),
    boundaries: [...new Set(boundaries)].slice(0, 8),
    hostNotes: [source.personality, source.description].filter(Boolean).join(' ').slice(0, 1000),
    voiceStyle: String(source.personality || '').slice(0, 200),
    soundPack: 'species',
    draft: true,
    confidence: text.length > 80 ? 'medium' : 'low',
  };
}

export { DEFAULT_TRAITS };
