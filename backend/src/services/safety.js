// services/safety.js
// Fast + robust self-harm detection (keywords + quick HF text-classification model)
// Model: sentinet/suicidality (LABEL_1 = suicidality, LABEL_0 = non-suicidal)
// Sources: model labels on HF model card; HF inference endpoints can sometimes return "Not Found" text.
// - https://huggingface.co/sentinet/suicidality  :contentReference[oaicite:0]{index=0}
// - Some users report 404/Not Found from public inference APIs intermittently :contentReference[oaicite:1]{index=1}

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Quick, inference-compatible text classification model
const HF_MODEL = "sentinet/suicidality";

// Prefer the classic public Inference API first (often simplest).
// Fallback to router endpoint if needed.
const HF_ENDPOINTS = [
  `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
];

// Hard triggers: immediate high risk (no network)
const HIGH_RISK_PATTERNS = [
  /\b(i want to die|kill myself|end my life)\b/i,
  /\b(suicide|suicidal)\b/i,
  /\b(i am going to (kill|harm) myself)\b/i,
  /\b(overdose|jump off|hang myself)\b/i,
  /\b(i plan to (kill|harm) myself)\b/i,
];

function withTimeout(ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { controller, timeoutId };
}

// tiny in-memory cache (per process)
const cache = new Map();
// optional: keep cache from growing forever
const MAX_CACHE = 500;

function setCache(key, value) {
  if (cache.size >= MAX_CACHE) {
    // delete oldest entry
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, value);
}

async function fetchJsonSafe(url, bodyObj, signal) {
  const resp = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyObj),
  });

  // IMPORTANT: HF sometimes returns plain text like "Not Found"
  const raw = await resp.text();

  let json = null;
  try {
    json = JSON.parse(raw);
  } catch {
    // Non-JSON body (e.g. "Not Found")
    return { ok: resp.ok, status: resp.status, raw, json: null };
  }

  return { ok: resp.ok, status: resp.status, raw, json };
}

function parseTextClassification(json) {
  // Expected common shapes:
  // 1) [{ label: "LABEL_1", score: 0.9 }, ...]
  // 2) [[{label,score}, ...]] (rare)
  // 3) { error: "..."} etc.
  if (!json) return null;

  // unwrap nested arrays
  let arr = json;
  if (Array.isArray(arr) && Array.isArray(arr[0]) && arr[0][0]?.label) {
    arr = arr[0];
  }
  if (
    !Array.isArray(arr) ||
    !arr[0]?.label ||
    typeof arr[0]?.score !== "number"
  ) {
    return null;
  }
  // pick top-1
  return arr[0];
}

export async function detectSelfHarm(text = "") {
  const cleanText = (text || "").trim();
  if (!cleanText) return { flagged: false, level: "none", source: "empty" };

  // 1) hard keyword triggers
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(cleanText)) {
      return { flagged: true, level: "high", source: "keyword" };
    }
  }

  // 2) token check
  if (!HF_API_KEY) {
    return { flagged: false, level: "none", source: "no_token" };
  }

  // 3) cache only successful model results (optional)
  if (cache.has(cleanText)) return cache.get(cleanText);

  const body = { inputs: cleanText, options: { wait_for_model: true } };
  let lastDiag = null;

  // Try both endpoints
  for (const url of HF_ENDPOINTS) {
    // fresh timeout per attempt
    const { controller, timeoutId } = withTimeout(12000);

    try {
      const diag = await fetchJsonSafe(url, body, controller.signal);
      lastDiag = { url, ...diag };

      if (!diag.ok) continue;

      const pred = parseTextClassification(diag.json);
      if (!pred) continue;

      const label = String(pred.label);
      const score = Number(pred.score);
      const isSuicidality = label === "LABEL_1";

      const result =
        isSuicidality && score >= 0.7
          ? {
              flagged: true,
              level: score >= 0.85 ? "high" : "medium",
              source: "model",
              label,
              score,
            }
          : { flagged: false, level: "none", source: "model", label, score };

      setCache(cleanText, result); // cache only good result
      console.log("Safety check result:", { text: cleanText, ...result });
      return result;
    } catch (err) {
      if (err?.name === "AbortError") {
        // Don't cache timeout; try next endpoint
        lastDiag = { url, ok: false, status: 0, raw: "timeout", json: null };
        continue;
      }
      console.error("Safety detection error:", err);
      // Don't cache unexpected errors; try next endpoint
      lastDiag = {
        url,
        ok: false,
        status: 0,
        raw: String(err?.message || err),
        json: null,
      };
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.error("HF safety check failed on all endpoints:", lastDiag);
  return { flagged: false, level: "none", source: "hf_failed" };
}

export function buildCrisisResponse() {
  return {
    type: "crisis",
    message:
      "I’m really sorry you’re feeling this way. You deserve support right now.\n\n" +
      "If you’re in the U.S., you can call or text 988 (Suicide & Crisis Lifeline).\n" +
      "If you’re in immediate danger, call 911.\n\n" +
      "If you're outside the U.S., find local resources here:\n" +
      "https://www.opencounseling.com/suicide-hotlines",
    resources: [
      { label: "Call or Text 988 (U.S.) ", href: "https://988lifeline.org/" },
      {
        label: "Find international hotlines (Intl)",
        href: "https://www.opencounseling.com/suicide-hotlines",
      },
    ],
  };
}
