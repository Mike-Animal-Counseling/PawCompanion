import { Router } from 'express';
import Animal from '../models/Animal.js';
import ChatMemory from '../models/ChatMemory.js';
import Checkin from '../models/Checkin.js';
import RiskEvent from '../models/RiskEvent.js';
import UserRiskProfile from '../models/UserRiskProfile.js';
import { asyncHandler, conflict, notFound } from '../lib/errors.js';
import { isObjectId } from '../lib/ids.js';
import { ok } from '../lib/http.js';
import { validate } from '../lib/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { detectSelfHarm, buildCrisisResponse, SAFETY_DISCLAIMER, safetyResources } from '../services/safety.js';
import { recordRiskEventAndUpdateProfile, deleteRiskData } from '../services/riskScoring.js';
import { detectMode, generateResponse } from '../services/aiService.js';
import { extractTextAndImagePrompt, generateImage } from '../services/imageGeneration.js';
import { suggestedPrompts } from '../services/personalityProfiles.js';
import {
  digitalPromptContext,
  digitalStateView,
  getDigitalProfile,
  getOrCreateDigitalState,
  planDigitalTurn,
  recordDigitalInteraction,
} from '../services/digitalPetService.js';
import { chatSchema, conversationListQuerySchema, conversationParamsSchema } from '../validators/ai.js';
import { paginationMeta } from '../lib/http.js';

const router = Router();
router.use(requireAuth, requireRole('customer'));

const PUBLIC_FILTER = { isActive: true, visibility: 'public', moderationStatus: 'visible' };
const MAX_MESSAGES = 80;

function profileView(profile) {
  if (!profile) {
    return {
      status: 'ok',
      score7d: 0,
      score30d: 0,
      events7d: 0,
      events30d: 0,
      maxLevel30d: 'none',
      lastRiskAt: null,
    };
  }
  return {
    status: profile.status,
    flagReason: profile.flagReason || '',
    score7d: Math.round((profile.score7d || 0) * 10) / 10,
    score30d: Math.round((profile.score30d || 0) * 10) / 10,
    events7d: profile.events7d,
    events30d: profile.events30d,
    maxLevel30d: profile.maxLevel30d,
    lastRiskAt: profile.lastRiskAt,
    acknowledgedAt: profile.acknowledgedAt,
  };
}

function trimMessages(messages) {
  return messages.slice(-MAX_MESSAGES).map((message) => ({
    role: message.role,
    content: String(message.content || '').slice(0, 4000),
    timestamp: message.timestamp,
    ...(message.meta ? { meta: message.meta } : {}),
  }));
}

router.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const config = _req.app.locals.config;
    return ok(res, {
      modelEnabled: Boolean(config.ai.enabled && config.ai.apiKey),
      mode: config.ai.enabled && config.ai.apiKey ? 'model' : 'demo',
      disclaimer: SAFETY_DISCLAIMER,
      resources: safetyResources(),
    });
  }),
);

router.post(
  '/chat',
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    const config = req.app.locals.config;
    const userId = req.auth.sub;
    const { animalId, message } = req.body;

    const animal = await Animal.findOne({ _id: animalId, ...PUBLIC_FILTER }).lean();
    if (!animal) throw notFound('Companion not found');
    const digitalProfile = getDigitalProfile(animal);
    if (!digitalProfile.enabled) throw conflict('This companion has not enabled their digital self yet');
    const digitalState = await getOrCreateDigitalState(userId, animalId);

    let memory = await ChatMemory.findOne({ userId, animalId });
    if (!memory) {
      memory = new ChatMemory({
        userId,
        animalId,
        animalName: animal.name,
        messages: [],
        chatMode: 'play',
        supportTurnsLeft: 0,
      });
    }
    memory.animalName = animal.name;
    memory.messages = trimMessages(memory.messages);
    memory.messages.push({ role: 'user', content: message, timestamp: new Date() });

    const risk = await detectSelfHarm(message, {
      apiKey: config.ai.enabled ? config.ai.apiKey : '',
    });
    const riskProfile = await recordRiskEventAndUpdateProfile({ userId, animalId, risk }).catch(() => null);

    if (risk.flagged) {
      const crisis = buildCrisisResponse();
      memory.chatMode = 'support';
      memory.supportTurnsLeft = 4;
      memory.messages.push({
        role: 'assistant',
        content: crisis.message,
        timestamp: new Date(),
        meta: crisis,
      });
      memory.messages = trimMessages(memory.messages);
      memory.lastMessageAt = new Date();
      await memory.save();
      return ok(res, {
        response: crisis.message,
        image: null,
        meta: { ...crisis, provider: 'safety', mode: 'support' },
        memory: { id: String(memory._id), messages: memory.messages, chatMode: memory.chatMode },
        messageCount: memory.messages.length,
        routeMeta: { mode: 'support', confidence: 1, rationale: 'safety_override', provider: 'safety' },
        userProfile: profileView(riskProfile || (await UserRiskProfile.findOne({ userId }).lean())),
        digital: {
          mood: 'gentle',
          behaviour: 'stay_close',
          animation: 'still',
          sound: null,
          state: digitalStateView(digitalState),
        },
        suggestedPrompts: suggestedPrompts(animal),
      });
    }

    const routing = await detectMode({
      animal,
      messages: memory.messages,
      message,
      config,
    });

    let mode = memory.chatMode || 'play';
    let turnsLeft = memory.supportTurnsLeft || 0;
    const EARLY_EXIT_CONFIDENCE = 0.85;

    if (mode === 'support' && turnsLeft > 0) {
      if (routing.mode === 'play' && routing.confidence >= EARLY_EXIT_CONFIDENCE) {
        mode = 'play';
        turnsLeft = 0;
      } else {
        mode = 'support';
        turnsLeft = Math.max(0, turnsLeft - 1);
      }
    } else if (routing.mode === 'support') {
      mode = 'support';
      turnsLeft = 4;
    } else {
      mode = 'play';
      turnsLeft = 0;
    }

    memory.chatMode = mode;
    memory.supportTurnsLeft = turnsLeft;

    const digitalPlan = planDigitalTurn({
      animal,
      profile: digitalProfile,
      state: digitalState,
      mode,
      message,
    });
    const digitalContext = digitalPromptContext(digitalProfile, digitalPlan, digitalState);

    const generated = await generateResponse({
      animal,
      messages: memory.messages,
      message,
      mode,
      config,
      digitalContext,
    });

    const { text: cleaned, imagePrompt } = extractTextAndImagePrompt(generated.text);
    let image = null;
    if (imagePrompt && mode === 'play') {
      image = await generateImage(imagePrompt, config);
    }

    const digital = {
      mood: digitalPlan.mood,
      behaviour: digitalPlan.behaviour,
      animation: digitalPlan.animation,
      sound: digitalPlan.sound,
      state: digitalStateView(digitalState),
    };

    memory.messages.push({
      role: 'assistant',
      content: cleaned,
      timestamp: new Date(),
      meta: { ...(image ? { imagePrompt } : {}), digital },
    });
    memory.messages = trimMessages(memory.messages);
    memory.lastMessageAt = new Date();
    await memory.save();
    const updatedState = (await recordDigitalInteraction(digitalState, digitalPlan)) || digitalState;
    digital.state = digitalStateView(updatedState);

    const latestProfile = riskProfile || (await UserRiskProfile.findOne({ userId }).lean());

    return ok(res, {
      response: cleaned,
      image,
      meta: { provider: generated.provider, mode },
      memory: { id: String(memory._id), messages: memory.messages, chatMode: memory.chatMode },
      messageCount: memory.messages.length,
      routeMeta: {
        mode,
        confidence: routing.confidence,
        rationale: routing.rationale,
        provider: generated.provider,
      },
      userProfile: profileView(latestProfile),
      digital,
      suggestedPrompts: suggestedPrompts(animal),
    });
  }),
);

router.get(
  '/conversations',
  validate(conversationListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query;
    const filter = { userId: req.auth.sub };
    const [total, memories] = await Promise.all([
      ChatMemory.countDocuments(filter),
      ChatMemory.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    const animals = await Animal.find({ _id: { $in: memories.map((memory) => memory.animalId) } })
      .select('name imageUrl species breed')
      .lean();
    const byId = new Map(animals.map((animal) => [String(animal._id), animal]));

    return ok(
      res,
      memories.map((memory) => {
        const animal = byId.get(String(memory.animalId));
        const last = memory.messages[memory.messages.length - 1];
        return {
          animalId: String(memory.animalId),
          animalName: animal?.name || memory.animalName || 'Companion',
          imageUrl: animal?.imageUrl || '',
          species: animal?.species || '',
          breed: animal?.breed || '',
          mode: memory.chatMode,
          messageCount: memory.messages.length,
          preview: last ? String(last.content).slice(0, 140) : '',
          lastMessageAt: memory.lastMessageAt || memory.updatedAt,
        };
      }),
      paginationMeta(page, pageSize, total),
    );
  }),
);

router.get(
  '/conversations/:animalId',
  validate(conversationParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const animal = await Animal.findOne({ _id: req.params.animalId, ...PUBLIC_FILTER }).lean();
    if (!animal) throw notFound('Companion not found');
    const memory = await ChatMemory.findOne({ userId: req.auth.sub, animalId: req.params.animalId }).lean();
    const digitalProfile = getDigitalProfile(animal);
    const digitalState = await getOrCreateDigitalState(req.auth.sub, req.params.animalId);
    return ok(res, {
      animal: {
        id: String(animal._id),
        name: animal.name,
        imageUrl: animal.imageUrl,
        personality: animal.personality,
        species: animal.species,
        breed: animal.breed || '',
      },
      messages: memory?.messages || [],
      chatMode: memory?.chatMode || 'play',
      digital: {
        enabled: digitalProfile.enabled,
        voice: digitalProfile.voice,
        traits: digitalProfile.traits,
        voiceStyle: digitalProfile.voiceStyle,
        routines: digitalProfile.routines,
        favorites: digitalProfile.favorites,
        state: digitalStateView(digitalState),
      },
      suggestedPrompts: suggestedPrompts(animal),
    });
  }),
);

router.delete(
  '/conversations/:animalId',
  validate(conversationParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const result = await ChatMemory.deleteOne({ userId: req.auth.sub, animalId: req.params.animalId });
    if (!result.deletedCount) throw notFound('Conversation not found');
    return ok(res, { deleted: true });
  }),
);

router.delete(
  '/conversations',
  asyncHandler(async (req, res) => {
    const result = await ChatMemory.deleteMany({ userId: req.auth.sub });
    return ok(res, { deleted: result.deletedCount });
  }),
);

router.get(
  '/safety',
  asyncHandler(async (req, res) => {
    const [profile, events] = await Promise.all([
      UserRiskProfile.findOne({ userId: req.auth.sub }).lean(),
      RiskEvent.find({ userId: req.auth.sub }).sort({ timestamp: -1 }).limit(10).lean(),
    ]);
    const eventAnimalIds = events.map((event) => event.animalId).filter(isObjectId);
    const animals = await Animal.find({ _id: { $in: eventAnimalIds } }).select('name').lean();
    const names = new Map(animals.map((animal) => [String(animal._id), animal.name]));
    return ok(res, {
      profile: profileView(profile),
      events: events.map((event) => ({
        level: event.level,
        animalName: names.get(String(event.animalId)) || '',
        timestamp: event.timestamp,
      })),
      disclaimer: SAFETY_DISCLAIMER,
      resources: safetyResources(),
      retention: {
        chatHistory: 'Kept until you delete it from this page.',
        riskEvents: 'Derived risk signals are kept for up to 120 days.',
        rawMessages: 'Raw messages are never stored in the risk log.',
      },
    });
  }),
);

router.delete(
  '/data',
  asyncHandler(async (req, res) => {
    const [chats, checkins, risk] = await Promise.all([
      ChatMemory.deleteMany({ userId: req.auth.sub }),
      Checkin.deleteMany({ customerId: req.auth.sub }),
      deleteRiskData(req.auth.sub),
    ]);
    return ok(res, { conversationsDeleted: chats.deletedCount, checkinsDeleted: checkins.deletedCount, ...risk });
  }),
);

export default router;
