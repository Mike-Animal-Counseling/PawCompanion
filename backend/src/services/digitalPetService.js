import DigitalPetState from '../models/DigitalPetState.js';

const SOUND_LIBRARY = {
  cat: {
    calm: [{ key: 'cat-purr', url: '/sounds/cat-purr.mp3', label: 'a low, steady purr', rate: 0.9 }],
    gentle: [{ key: 'cat-purr', url: '/sounds/cat-purr.mp3', label: 'a soft, close purr', rate: 0.88 }],
    affectionate: [
      { key: 'cat-purr', url: '/sounds/cat-purr.mp3', label: 'a warm purr', rate: 0.95 },
      { key: 'cat-trill', url: '/sounds/cat-trill.mp3', label: 'a small trill', rate: 1.02 },
    ],
    playful: [
      { key: 'cat-trill', url: '/sounds/cat-trill.mp3', label: 'an excited trill', rate: 1.08 },
      { key: 'cat-meow', url: '/sounds/cat-meow.mp3', label: 'a bright meow', rate: 1.05 },
    ],
    sleepy: [{ key: 'cat-purr', url: '/sounds/cat-purr.mp3', label: 'a sleepy, slow purr', rate: 0.82 }],
    shy: [{ key: 'cat-meow', url: '/sounds/cat-meow.mp3', label: 'a quiet, questioning meow', rate: 0.94 }],
    alert: [{ key: 'cat-meow', url: '/sounds/cat-meow.mp3', label: 'a sharp, curious meow', rate: 1.1 }],
  },
  dog: {
    calm: [{ key: 'dog-soft', url: '/sounds/dog-soft.mp3', label: 'a soft huff', rate: 0.92 }],
    gentle: [{ key: 'dog-soft', url: '/sounds/dog-soft.mp3', label: 'a low, gentle sound', rate: 0.9 }],
    affectionate: [{ key: 'dog-soft', url: '/sounds/dog-soft.mp3', label: 'a happy little sound', rate: 1.0 }],
    playful: [
      { key: 'dog-play', url: '/sounds/dog-play.mp3', label: 'an eager play sound', rate: 1.04 },
      { key: 'dog-bark', url: '/sounds/dog-bark.mp3', label: 'a bright bark', rate: 1.06 },
    ],
    sleepy: [{ key: 'dog-soft', url: '/sounds/dog-soft.mp3', label: 'a sleepy sigh', rate: 0.84 }],
    shy: [{ key: 'dog-soft', url: '/sounds/dog-soft.mp3', label: 'a small, uncertain sound', rate: 0.94 }],
    alert: [{ key: 'dog-bark', url: '/sounds/dog-bark.mp3', label: 'a short alert bark', rate: 1.08 }],
  },
  rabbit: {},
  other: {},
};

const MOOD_BEHAVIOUR = {
  calm: { behaviour: 'resting', animation: 'breathe' },
  gentle: { behaviour: 'settle_nearby', animation: 'slow_blink' },
  affectionate: { behaviour: 'lean_in', animation: 'blink' },
  playful: { behaviour: 'bring_toy', animation: 'bounce' },
  sleepy: { behaviour: 'curl_up', animation: 'yawn' },
  shy: { behaviour: 'peek', animation: 'ear_twitch' },
  alert: { behaviour: 'perk_up', animation: 'head_tilt' },
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function defaultTraits() {
  return { energy: 3, sociability: 3, curiosity: 3, anxiety: 2, playfulness: 3 };
}

export function getDigitalProfile(animal = {}) {
  const digital = animal.digital || {};
  const species = ['cat', 'dog', 'rabbit', 'other'].includes(digital.voice)
    ? digital.voice
    : ['cat', 'dog', 'rabbit'].includes(animal.species)
      ? animal.species
      : 'other';
  return {
    enabled: digital.enabled !== false,
    voice: species,
    traits: { ...defaultTraits(), ...(digital.traits || {}) },
    routines: digital.routines || [],
    favorites: digital.favorites || [],
    comforts: digital.comforts || [],
    boundaries: digital.boundaries || [],
    hostNotes: digital.hostNotes || '',
    voiceStyle: digital.voiceStyle || '',
    soundPack: digital.soundPack || 'species',
  };
}

export async function getOrCreateDigitalState(userId, animalId) {
  const defaults = {
    userId: String(userId),
    animalId: String(animalId),
    mood: 'calm',
    energy: 70,
    attention: 60,
    trust: 40,
    interactions: 0,
    lastInteractionAt: new Date(),
  };
  try {
    return await DigitalPetState.findOneAndUpdate(
      { userId: String(userId), animalId: String(animalId) },
      { $setOnInsert: defaults },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code === 11000) {
      return DigitalPetState.findOne({ userId: String(userId), animalId: String(animalId) });
    }
    throw error;
  }
}

function chooseMood({ animal, profile, state, mode, message, now }) {
  if (mode === 'support') return 'gentle';
  const text = String(message || '');
  const hour = now.getHours();
  const traits = profile.traits;
  if (/\b(play|game|toy|fetch|chase|walk|adventure)\b/i.test(text) || /(玩|游戏|球|追|散步)/.test(text)) {
    return 'playful';
  }
  if (hour >= 22 || hour < 7 || state.energy < 24) return 'sleepy';
  if (traits.anxiety >= 4 && state.trust < 42) return 'shy';
  if (/\b(hi|hello|hey|morning|good to see you)\b/i.test(text) || /(你好|嗨|早上好)/.test(text)) {
    return traits.sociability >= 3 ? 'affectionate' : 'shy';
  }
  if (/\b(love|miss|cuddle|stay|here|safe)\b/i.test(text) || /(想你|抱抱|陪我|安全)/.test(text)) {
    return 'affectionate';
  }
  if (traits.energy >= 4) return 'playful';
  if (traits.sociability >= 4) return 'affectionate';
  return 'calm';
}

function pickSound(profile, mood, seed, hostSounds = []) {
  const hosted = hostSounds.filter((sound) => sound.mood === mood);
  const pool = hosted.length ? hosted : hostSounds;
  if (pool.length) {
    const chosen = pool[Math.abs(seed) % pool.length];
    return {
      key: String(chosen._id || chosen.key || 'host-sound'),
      url: chosen.url,
      label: chosen.label || 'a familiar sound',
      rate: 1,
    };
  }
  const options = SOUND_LIBRARY[profile.voice]?.[mood] || [];
  if (!options.length) return null;
  const base = options[Math.abs(seed) % options.length];
  const rate = Math.min(1.16, Math.max(0.82, base.rate + (profile.traits.playfulness - 3) * 0.01));
  return {
    key: `${base.key}-${Math.abs(seed) % 4}`,
    url: base.url,
    label: base.label,
    rate: Math.round(rate * 100) / 100,
  };
}

export function planDigitalTurn({ animal, profile, state, mode = 'play', message = '', now = new Date(), hostSounds = [] }) {
  const safeProfile = profile || getDigitalProfile(animal);
  const mood = chooseMood({ animal, profile: safeProfile, state, mode, message, now });
  const behaviour = MOOD_BEHAVIOUR[mood] || MOOD_BEHAVIOUR.calm;
  const seed = String(animal.name || '').length + String(message).length + Number(state.interactions || 0);
  return {
    mood,
    ...behaviour,
    sound: pickSound(safeProfile, mood, seed, hostSounds),
  };
}

export async function recordDigitalInteraction(state, plan) {
  const energyDelta = plan.mood === 'playful' ? -7 : plan.mood === 'sleepy' ? 4 : -2;
  const attentionDelta = plan.mood === 'sleepy' ? -4 : 6;
  const trustDelta = plan.mood === 'gentle' ? 3 : 1;
  return DigitalPetState.findByIdAndUpdate(
    state._id,
    {
      $set: {
        mood: plan.mood,
        energy: clamp(state.energy + energyDelta),
        attention: clamp(state.attention + attentionDelta),
        trust: clamp(state.trust + trustDelta),
        interactions: Number(state.interactions || 0) + 1,
        lastSoundKey: plan.sound?.key || '',
        lastInteractionAt: new Date(),
      },
    },
    { new: true, runValidators: true },
  );
}

export function digitalStateView(state) {
  return {
    mood: state.mood,
    energy: Math.round(clamp(state.energy)),
    attention: Math.round(clamp(state.attention)),
    trust: Math.round(clamp(state.trust)),
    interactions: Number(state.interactions || 0),
  };
}

export function digitalPromptContext(profile, plan, state) {
  const soundLine = plan.sound
    ? `The app will play ${plan.sound.label} (${profile.voice}) alongside your text; your text is the translated meaning of that sound, not human speech.`
    : 'The app has no sound for this species yet; stay visually and textually expressive.';
  const facts = [
    profile.hostNotes ? `Host's description: ${profile.hostNotes}` : '',
    profile.voiceStyle ? `Voice style: ${profile.voiceStyle}` : '',
    profile.routines.length ? `Routines: ${profile.routines.join(', ')}` : '',
    profile.favorites.length ? `Favourite things: ${profile.favorites.join(', ')}` : '',
    profile.comforts.length ? `Comforts: ${profile.comforts.join(', ')}` : '',
    profile.boundaries.length ? `Boundaries: ${profile.boundaries.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  return `You are a digital companion inspired by ${profile.voice === 'other' ? 'this animal' : `a ${profile.voice}`}, not the real animal. Do not claim to be the real animal or a human.
${facts ? `What the host told us about this individual:\n${facts}\n` : ''}Current state: mood=${plan.mood}, energy=${state.energy}/100, attention=${state.attention}/100, trust=${state.trust}/100, interactions=${state.interactions}.
Body: ${plan.behaviour}; animation: ${plan.animation}.
${soundLine}
Keep the reply in character, short, and grounded in this state. If the guest is in crisis, the safety layer overrides this and the text must be clear and human-readable.`;
}

export { SOUND_LIBRARY };
