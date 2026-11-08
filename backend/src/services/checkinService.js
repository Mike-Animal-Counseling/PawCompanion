import Animal from '../models/Animal.js';
import ChatMemory from '../models/ChatMemory.js';
import Checkin from '../models/Checkin.js';
import Favorite from '../models/Favorite.js';
import UserRiskProfile from '../models/UserRiskProfile.js';
import { addDaysString, localDateString } from '../lib/time.js';
import { detectSelfHarm, buildCrisisResponse, SAFETY_DISCLAIMER } from './safety.js';
import { recordRiskEventAndUpdateProfile } from './riskScoring.js';
import { generateResponse } from './aiService.js';

const PUBLIC_FILTER = { isActive: true, visibility: 'public', moderationStatus: 'visible' };
const SUPPORT_TAGS = new Set(['anxious', 'lonely', 'tired', 'overwhelmed']);

export function checkinView(checkin) {
  if (!checkin) return null;
  return {
    id: String(checkin._id),
    date: checkin.date,
    mood: checkin.mood,
    energy: checkin.energy,
    note: checkin.note || '',
    tags: checkin.tags || [],
    animalId: checkin.animalId ? String(checkin.animalId) : null,
    animalName: checkin.animalName || '',
    aiReply: checkin.aiReply || '',
    safetyLevel: checkin.safetyLevel || 'none',
    mode: checkin.mode || 'play',
    createdAt: checkin.createdAt,
  };
}

async function resolveCompanion(customerId, animalId) {
  if (animalId) {
    const animal = await Animal.findOne({ _id: animalId, ...PUBLIC_FILTER }).lean();
    if (animal) return animal;
  }
  const [recentChat, favorite] = await Promise.all([
    ChatMemory.findOne({ userId: String(customerId) }).sort({ lastMessageAt: -1 }).lean(),
    Favorite.findOne({ customerId }).sort({ createdAt: -1 }).lean(),
  ]);
  const fallbackId = recentChat?.animalId || favorite?.animalId;
  if (!fallbackId) return null;
  return Animal.findOne({ _id: fallbackId, ...PUBLIC_FILTER }).lean();
}

function checkinFallbackReply({ mood, energy, tags }) {
  const openers = {
    1: 'Thank you for telling me. That sounds really heavy, and I am glad you did not keep it to yourself.',
    2: 'I am glad you checked in. Some days are just harder, and you do not have to perform being okay.',
    3: 'Thanks for checking in. A middle day is still a day worth noticing.',
    4: 'I am glad there is some good in today. It is worth letting yourself feel it.',
    5: 'That is lovely to hear. I hope you let yourself enjoy it without waiting for the other shoe to drop.',
  };
  const questions = {
    1: 'What would make the next hour a little gentler?',
    2: 'What is one small thing that could make tonight easier?',
    3: 'What is one thing you want to remember from today?',
    4: 'What made the good part good?',
    5: 'What do you want to keep from today?',
  };
  const notes = [];
  if ((tags || []).includes('lonely')) notes.push('Loneliness can make everything feel louder. You reached out here, and that counts.');
  if ((tags || []).includes('anxious')) notes.push('Anxiety often asks us to solve everything at once. We only need the next small step.');
  if (Number(energy) <= 2) notes.push('Low energy is information, not a failure.');
  return [openers[mood] || openers[3], ...notes, questions[mood] || questions[3]].join(' ');
}

function fallbackAnimal() {
  return {
    name: 'PawCompanion',
    species: 'dog',
    breed: '',
    personalityProfile: 'dog_gentle',
    personality: 'A calm companion who is always glad you checked in.',
    tags: ['gentle'],
    ageMonths: 48,
  };
}

export async function upsertCheckin({ customer, input, config }) {
  const date = localDateString();
  const animal = await resolveCompanion(customer._id, input.animalId);
  const companion = animal || fallbackAnimal();
  const mode = input.mood <= 2 || input.tags.some((tag) => SUPPORT_TAGS.has(tag)) ? 'support' : 'play';

  const risk = await detectSelfHarm(input.note || '', {
    apiKey: config.ai.enabled ? config.ai.apiKey : '',
  });
  const profile = await recordRiskEventAndUpdateProfile({
    userId: String(customer._id),
    animalId: animal ? String(animal._id) : '',
    risk,
  }).catch(() => null);

  let aiReply;
  let safetyLevel = risk.level || 'none';
  if (risk.flagged) {
    aiReply = buildCrisisResponse().message;
    safetyLevel = 'high';
  } else {
    const checkinMessage =
      `[Daily check-in] My mood is ${input.mood}/5 and energy is ${input.energy}/5.` +
      (input.note ? ` ${input.note}` : '') +
      (input.tags.length ? ` I am feeling ${input.tags.join(', ')}.` : '');
    if (config.ai.enabled && config.ai.apiKey) {
      const generated = await generateResponse({
        animal: companion,
        messages: [],
        message: checkinMessage,
        mode,
        config,
      }).catch(() => null);
      aiReply = generated?.text;
    }
    aiReply = aiReply || checkinFallbackReply({ mood: input.mood, energy: input.energy, tags: input.tags });
  }

  let checkin = await Checkin.findOne({ customerId: customer._id, date });
  const payload = {
    mood: input.mood,
    energy: input.energy,
    note: input.note || '',
    tags: input.tags || [],
    animalId: animal?._id,
    animalName: animal?.name || companion.name,
    aiReply: String(aiReply).slice(0, 2000),
    safetyLevel,
    mode,
  };

  if (checkin) {
    Object.assign(checkin, payload);
    await checkin.save();
  } else {
    checkin = await Checkin.create({ customerId: customer._id, date, ...payload });
  }

  // A daily check-in is part of the online companionship thread. Keep the
  // companion's reply in the same conversation so the relationship has memory.
  if (animal) {
    let memory = await ChatMemory.findOne({ userId: String(customer._id), animalId: String(animal._id) });
    if (!memory) {
      memory = new ChatMemory({
        userId: String(customer._id),
        animalId: String(animal._id),
        animalName: animal.name,
        messages: [],
        chatMode: mode,
      });
    }
    memory.chatMode = mode;
    memory.supportTurnsLeft = mode === 'support' ? Math.max(memory.supportTurnsLeft || 0, 2) : 0;
    memory.messages.push({ role: 'user', content: `Daily check-in · ${input.mood}/5${input.note ? ` · ${input.note}` : ''}`, timestamp: new Date() });
    memory.messages.push({ role: 'assistant', content: String(aiReply).slice(0, 2000), timestamp: new Date(), ...(risk.flagged ? { meta: buildCrisisResponse() } : {}) });
    memory.messages = memory.messages.slice(-80);
    memory.lastMessageAt = new Date();
    await memory.save();
  }

  const streak = await checkinStreak(customer._id);
  return {
    checkin: checkinView(checkin),
    streak,
    safety: {
      flagged: Boolean(risk.flagged),
      level: safetyLevel,
      resources: risk.flagged ? buildCrisisResponse().resources : [],
      disclaimer: SAFETY_DISCLAIMER,
    },
    profileStatus: profile?.status || 'ok',
  };
}

export async function checkinStreak(customerId, now = new Date()) {
  const recent = await Checkin.find({ customerId }).select('date').sort({ date: -1 }).limit(120).lean();
  const dates = new Set(recent.map((item) => item.date));
  const today = localDateString(now);
  let cursor = dates.has(today) ? today : addDaysString(today, -1);
  let streak = 0;
  while (dates.has(cursor) && streak < 120) {
    streak += 1;
    cursor = addDaysString(cursor, -1);
  }
  return streak;
}

export async function checkinHistory({ customerId, days = 30 }) {
  const from = addDaysString(localDateString(), -(days - 1));
  const items = await Checkin.find({ customerId, date: { $gte: from } }).sort({ date: -1 }).lean();
  const streak = await checkinStreak(customerId);
  const byDate = new Map(items.map((item) => [item.date, item]));
  const series = Array.from({ length: days }, (_, index) => {
    const date = addDaysString(from, index);
    const entry = byDate.get(date);
    return { date, mood: entry?.mood || null, energy: entry?.energy || null, checkedIn: Boolean(entry) };
  });
  const checkedIn = items.length;
  const averageMood = checkedIn ? Math.round((items.reduce((sum, item) => sum + item.mood, 0) / checkedIn) * 10) / 10 : null;
  return {
    items: items.map(checkinView),
    streak,
    series,
    averageMood,
    checkedIn,
    days,
  };
}

export async function todayCheckin(customerId) {
  return checkinView(await Checkin.findOne({ customerId, date: localDateString() }).lean());
}

export async function checkinSummary(customerId) {
  const [today, streak, profile] = await Promise.all([
    todayCheckin(customerId),
    checkinStreak(customerId),
    UserRiskProfile.findOne({ userId: String(customerId) }).lean(),
  ]);
  return {
    today,
    streak,
    safetyStatus: profile?.status || 'ok',
  };
}

export async function deleteCheckin({ customerId, id }) {
  return Checkin.deleteOne({ _id: id, customerId });
}
