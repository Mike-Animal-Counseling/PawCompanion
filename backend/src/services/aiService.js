import { providerFetch } from './providerFetch.js';
import { buildSystemPrompt, getPersonalityProfile } from './personalityProfiles.js';

const HF_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';

const ROUTER_PROMPT = `You are a routing classifier for an AI pet companion app.
Decide the best mode for the next reply.

support: the user is seeking emotional help, is clearly distressed, or is talking about a painful personal experience.
play: greetings, small talk, jokes, games, stories, flirting, or light conversation.

Rules:
- Intent beats sentiment. A neutral question is not distress.
- Do not invent distress.
- If uncertain, choose play.
Return ONLY JSON: {"mode":"support"|"play","confidence":0.0-1.0,"rationale":"<=12 words"}`;

const SUPPORT_SIGNALS = [
  /\b(sad|depress|anxious|anxiety|panic|overwhelm|stress|lonely|alone|grief|grieving|heartbroken|breakup|crying|cry|hopeless|worthless|exhausted|burn(ed|t) out|can'?t cope|don'?t know what to do|rough day|bad day|terrible day|need(ed)? to talk|feel(ing)? (lost|stuck|empty|awful))\b/i,
  /(难过|焦虑|压力|孤独|寂寞|崩溃|撑不住|心情不好|失恋|想哭|迷茫|累死|绝望)/,
];

const PLAY_SIGNALS = [
  /\b(joke|story|game|play|draw|roleplay|adventure|fun|silly|dance|sing|flirt|date)\b/i,
  /(笑话|故事|游戏|玩|角色扮演|画画|唱歌|跳舞)/,
];

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

export function classifyModeLocally(message = '') {
  const text = String(message);
  const supportHits = SUPPORT_SIGNALS.filter((pattern) => pattern.test(text)).length;
  const playHits = PLAY_SIGNALS.filter((pattern) => pattern.test(text)).length;
  if (supportHits > 0 && playHits === 0) {
    return { mode: 'support', confidence: Math.min(0.92, 0.62 + supportHits * 0.12), rationale: 'local:intent_support', provider: 'local' };
  }
  if (playHits > 0) {
    return { mode: 'play', confidence: 0.72, rationale: 'local:intent_play', provider: 'local' };
  }
  return { mode: 'play', confidence: 0.55, rationale: 'local:default_play', provider: 'local' };
}

function safeJsonParse(text) {
  const raw = String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callChat(config, messages, { model, temperature, maxTokens }) {
  if (!config.ai.apiKey) throw new Error('AI provider is not configured');
  const response = await providerFetch(
    HF_CHAT_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: Math.min(Math.max(Number(maxTokens) || 220, 1), 512),
      }),
    },
    1024 * 1024,
  );
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) throw new Error('Empty response from AI provider');
  return String(content).trim();
}

export async function detectMode({ animal, messages = [], message, config }) {
  const local = classifyModeLocally(message);
  if (!config.ai.enabled || !config.ai.apiKey) return local;

  const recentUsers = messages
    .filter((item) => item.role === 'user')
    .slice(-2)
    .map((item) => String(item.content || '').slice(0, 400));

  try {
    const raw = await callChat(
      config,
      [
        { role: 'system', content: ROUTER_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            animal: { name: animal?.name, species: animal?.species },
            recent_user_messages: recentUsers,
            current_user_message: String(message).slice(0, 500),
          }),
        },
      ],
      { model: config.ai.routerModel, temperature: 0, maxTokens: 80 },
    );
    const parsed = safeJsonParse(raw);
    if (!parsed) return local;
    const confidence = clamp01(parsed.confidence);
    if (confidence < config.ai.routerThreshold) return { ...local, confidence: Math.max(local.confidence, confidence), rationale: 'router:low_confidence' };
    return {
      mode: parsed.mode === 'support' ? 'support' : 'play',
      confidence,
      rationale: String(parsed.rationale || '').slice(0, 80),
      provider: 'huggingface',
    };
  } catch {
    return { ...local, rationale: local.rationale };
  }
}

function pick(list, seed) {
  if (!list?.length) return '';
  const index = Math.abs(seed) % list.length;
  return list[index];
}

function lastUserMessage(messages, message) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') return String(messages[index].content || '');
  }
  return String(message || '');
}

/**
 * A deterministic, persona-aware reply for when no model provider is
 * configured. It is intentionally simple, but it keeps the product honest:
 * the demo works end to end without a paid API key.
 */
export function localCompanionReply({ animal, messages = [], message, mode = 'play' }) {
  const profile = getPersonalityProfile(animal);
  const voice = profile.voice;
  const seed = String(message).length + String(animal.name || '').length;
  const recentUserCount = messages.filter((item) => item.role === 'user').length;
  const latest = String(message).trim().toLowerCase();
  const previous = lastUserMessage(messages.slice(0, -1)).toLowerCase();

  const isGreeting = /^(hi|hey|hello|yo|good (morning|afternoon|evening)|howdy)\b/.test(latest);
  const isThanks = /\b(thanks|thank you|ty|appreciate)\b/.test(latest);
  const isBye = /\b(bye|goodnight|good night|see you|talk later)\b/.test(latest);
  const isQuestion = latest.includes('?') || /^(what|why|how|do you|can you|are you|tell me)\b/.test(latest);

  if (isThanks) {
    return {
      text: `Anytime. I am glad you came by. Want to stay a little longer, or should I let you get back to your day?`,
      provider: 'local',
    };
  }
  if (isBye) {
    return { text: `Go gently. I will be here when you want to talk again.`, provider: 'local' };
  }
  if (mode === 'support') {
    return {
      text: `${pick(voice.comfort, seed)} What is the heaviest part of it right now?`,
      provider: 'local',
    };
  }
  if (isGreeting && recentUserCount <= 1) {
    return { text: `${pick(voice.greetings, seed)} What has your day been like?`, provider: 'local' };
  }
  if (isQuestion || latest.includes('you')) {
    return {
      text: `${pick(voice.facts, seed)} What about you — what is something small you noticed today?`,
      provider: 'local',
    };
  }
  if (previous && /\b(sad|hard|rough|tired|stress|lonely)\b/i.test(previous)) {
    return {
      text: `I am still here. You do not have to make it sound better than it is. What happened today?`,
      provider: 'local',
    };
  }
  return {
    text: `${pick(voice.play, seed)} What kind of day are you having?`,
    provider: 'local',
  };
}

export async function generateResponse({ animal, messages = [], message, mode = 'play', config }) {
  if (!config.ai.enabled || !config.ai.apiKey) {
    return localCompanionReply({ animal, messages, message, mode });
  }

  const history = messages
    .filter((item) => item.role === 'user' || item.role === 'assistant')
    .slice(-20)
    .map((item) => ({ role: item.role, content: String(item.content || '').slice(0, 2000) }));

  const payload = [{ role: 'system', content: buildSystemPrompt(animal, mode) }, ...history];
  const last = payload[payload.length - 1];
  if (!last || last.role !== 'user' || last.content.trim() !== String(message).trim()) {
    payload.push({ role: 'user', content: String(message) });
  }

  try {
    const text = await callChat(config, payload, {
      model: config.ai.chatModel,
      temperature: config.ai.temperature,
      maxTokens: config.ai.maxTokens,
    });
    const trimmed = text.length > 800 ? `${text.slice(0, 800)}…` : text;
    return { text: trimmed, provider: 'huggingface' };
  } catch {
    // Provider outages should degrade to the local companion, not a 500 page.
    return localCompanionReply({ animal, messages, message, mode });
  }
}

export { safeJsonParse };
