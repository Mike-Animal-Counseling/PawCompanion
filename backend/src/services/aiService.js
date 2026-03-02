// services/aiService.js
import { buildSystemPrompt } from "./personalityProfiles.js";

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || "";
const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";

const DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct";
const HF_CHAT_MODEL = process.env.HF_CHAT_MODEL || DEFAULT_MODEL;

// Router model can be the same model or a smaller/cheaper one if you set env
const HF_ROUTER_MODEL =
  process.env.HF_ROUTER_MODEL || "meta-llama/Llama-3.2-3B-Instruct"; // smaller, cheaper, faster for classification

const DEFAULT_MAX_TOKENS = Number(process.env.HF_MAX_TOKENS || 220);
const DEFAULT_TEMPERATURE = Number(process.env.HF_TEMPERATURE || 0.7);

// Router is cheap: small output, deterministic
const ROUTER_MAX_TOKENS = Number(process.env.HF_ROUTER_MAX_TOKENS || 80);
const ROUTER_THRESHOLD = Number(process.env.HF_ROUTER_THRESHOLD || 0.55);
const ROUTER_CONTEXT_USER_MSGS = Number(
  process.env.HF_ROUTER_CONTEXT_USER_MSGS || 2,
);
const ROUTER_CONTEXT_CHARS = Number(process.env.HF_ROUTER_CONTEXT_CHARS || 500);

const ROUTER_SYSTEM_PROMPT = `
You are a routing classifier for an AI pet companion chat app.
Decide the best mode for the NEXT assistant reply.

Choose exactly one mode:

support:
Use ONLY when the user is seeking emotional help (coping, reassurance, reflection, advice),
or when the user is clearly expressing emotional distress that calls for a supportive response.

play:
Use for greetings, small talk, casual conversation, fun interaction (roleplay, jokes, stories, games, drawing),
social/relationship/flirting/invitations, or when the user wants cheering up / distraction.

Decision rules (follow strictly):
1) Intent > sentiment. Do not treat a neutral question as distress.
2) Do NOT invent distress, coping requests, or emotional needs that are not stated.
3) Greetings and small talk are play.
4) Social or romantic questions/invitations are play unless the user asks for emotional help.
5) If the user asks for something fun (joke/story/roleplay/game/drawing), choose play even if they mention mild stress.
6) If the user expresses dissatisfaction or sadness without asking for fun, choose support.
7) If uncertain or ambiguous, choose play.

Output:
Return ONLY valid JSON (no markdown, no extra text).
Schema:
{"mode":"support" or "play","confidence":0.0 - 1.0,"rationale":"<=12 words"}
`.trim();

function safeJsonParse(text) {
  try {
    const raw = String(text || "").trim();

    // Strip common ```json fences if any
    const withoutFence = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    // 1) Try direct JSON parse
    try {
      return JSON.parse(withoutFence);
    } catch {
      // 2) Fallback: extract first JSON object region {...}
      const start = withoutFence.indexOf("{");
      const end = withoutFence.lastIndexOf("}");
      if (start >= 0 && end > start) {
        const slice = withoutFence.slice(start, end + 1);
        return JSON.parse(slice);
      }
      return null;
    }
  } catch {
    return null;
  }
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

async function callHuggingFace(
  messages,
  { model, temperature, max_tokens, signal } = {},
) {
  const apiStartTime = Date.now();
  const response = await fetch(HF_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
    }),
    signal,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let details = "";
    try {
      details = contentType.includes("application/json")
        ? JSON.stringify(await response.json())
        : await response.text();
    } catch {
      details = "Unable to parse error body";
    }

    const apiDuration = Date.now() - apiStartTime;
    console.log(
      `⏱️  HF API [${model}] ERROR (${response.status}): ${apiDuration}ms`,
    );

    const err = new Error(
      `HuggingFace chat error ${response.status}: ${details}`,
    );
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || !String(content).trim()) {
    const apiDuration = Date.now() - apiStartTime;
    console.log(
      `⏱️  HF API [${model}] ERROR (empty response): ${apiDuration}ms`,
    );

    const err = new Error("Empty response from HuggingFace chat API");
    err.status = 502;
    throw err;
  }

  const apiDuration = Date.now() - apiStartTime;
  console.log(`⏱️  HF API [${model}]: ${apiDuration}ms`);

  return String(content).trim();
}

/**
 * Smart router: uses a small LLM call to decide "support" vs "play".
 * Returns { mode, confidence, rationale }.
 *
 * Keep hysteresis in your main router (ai.router.js),
 * because even a good classifier can be unstable on short messages.
 */
export const detectMode = async (
  animal,
  messageHistory,
  userMessage,
  opts = {},
) => {
  const detectModeStartTime = Date.now();
  const { signal } = opts;

  // If no token configured, fall back to play
  if (!HUGGINGFACE_API_KEY || !HUGGINGFACE_API_KEY.trim()) {
    return { mode: "play", confidence: 0, rationale: "no_token" };
  }

  const history = Array.isArray(messageHistory) ? messageHistory : [];

  // Keep router input small: last N user messages + current
  const lastUserMsgs = history
    .filter((m) => m && m.role === "user")
    .slice(-ROUTER_CONTEXT_USER_MSGS)
    .map((m) => String(m.content || "").slice(0, ROUTER_CONTEXT_CHARS));

  const payload = {
    animal: { name: animal?.name || "pet", type: animal?.type || "" },
    recent_user_messages: lastUserMsgs,
    current_user_message: String(userMessage || "").slice(
      0,
      ROUTER_CONTEXT_CHARS,
    ),
  };

  const routerMessages = [
    { role: "system", content: ROUTER_SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(payload) },
  ];

  try {
    const raw = await callHuggingFace(routerMessages, {
      model: HF_ROUTER_MODEL,
      temperature: 0,
      max_tokens: ROUTER_MAX_TOKENS,
      signal,
    });

    console.log("router_raw:", raw);

    const parsed = safeJsonParse(raw);

    console.log("router_parsed:", parsed);

    const mode = parsed?.mode === "support" ? "support" : "play";
    const confidence = clamp01(parsed?.confidence);
    const rationale = String(parsed?.rationale || "").slice(0, 80);

    // If confidence too low, default to play (you can bias to support if you prefer)
    if (confidence < ROUTER_THRESHOLD) {
      const modeDuration = Date.now() - detectModeStartTime;
      console.log(`📊 detectMode() Total: ${modeDuration}ms`);
      return {
        mode: "play",
        confidence,
        rationale: rationale || "low_confidence",
      };
    }

    const modeDuration = Date.now() - detectModeStartTime;
    console.log(`📊 detectMode() Total: ${modeDuration}ms`);
    return { mode, confidence, rationale };
  } catch (err) {
    // Router failure should not break chat
    const modeDuration = Date.now() - detectModeStartTime;
    console.log(`📊 detectMode() Total (with error): ${modeDuration}ms`);
    console.error("Router error:", err?.message || err);
    return { mode: "play", confidence: 0, rationale: "router_error" };
  }
};

export const generateResponse = async (
  animal,
  messageHistory,
  userMessage,
  opts = {},
) => {
  const generateResponseStartTime = Date.now();
  const { signal, mode = "play" } = opts;

  if (!HUGGINGFACE_API_KEY || !HUGGINGFACE_API_KEY.trim()) {
    const err = new Error("HuggingFace API key not configured");
    err.status = 500;
    throw err;
  }

  const result = await callHuggingFaceChat(
    animal,
    messageHistory,
    userMessage,
    {
      signal,
      mode,
    },
  );

  const generateDuration = Date.now() - generateResponseStartTime;
  console.log(`📊 generateResponse() Total: ${generateDuration}ms\n`);

  return result;
};

async function callHuggingFaceChat(
  animal,
  messageHistory,
  userMessage,
  { signal, mode = "play" } = {},
) {
  const systemPrompt = buildSystemPrompt(animal, mode);

  const historyMessages = Array.isArray(messageHistory)
    ? messageHistory
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({
          role: m.role,
          content: String(m.content || ""),
        }))
    : [];

  const currentUser = String(userMessage || "").trim();

  // Build base message list
  let messages = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
  ];

  // Ensure the current userMessage is included (but avoid duplicating if already last)
  if (currentUser) {
    const last = messages[messages.length - 1];
    const lastIsSameUserMsg =
      last?.role === "user" &&
      String(last.content || "").trim() === currentUser;

    if (!lastIsSameUserMsg) {
      messages.push({ role: "user", content: currentUser });
    }
  }

  const MAX_HISTORY_MESSAGES = Number(process.env.HF_MAX_HISTORY || 20);
  const trimmed =
    messages.length > 1 + MAX_HISTORY_MESSAGES
      ? [messages[0], ...messages.slice(messages.length - MAX_HISTORY_MESSAGES)]
      : messages;

  const content = await callHuggingFace(trimmed, {
    model: HF_CHAT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    max_tokens: DEFAULT_MAX_TOKENS,
    signal,
  });

  let text = String(content).trim();
  const MAX_CHARS = Number(process.env.HF_MAX_CHARS || 800);
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + "...";

  return text;
}
