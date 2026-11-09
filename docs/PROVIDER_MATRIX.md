# Provider matrix

The strongest version is not one model for everything. It is a small set of
task-specific providers plus deterministic product invariants.

**Start with the fill-in checklist: [PROVIDER_SETUP.md](PROVIDER_SETUP.md).**

This document is the procurement / wiring plan. The code contracts live in
[`backend/src/config/providerSlots.js`](../backend/src/config/providerSlots.js)
and the reserved keys are in
[`backend/.env.example`](../backend/.env.example). Run:

```bash
cd backend
npm run check:providers
```

## What is provider-first now

- Chat, support-mode classification and onboarding extraction require a
  configured chat provider in production. There is no silent local reply.
- Local stubs are test-only (`NODE_ENV=test` or `ALLOW_LOCAL_FALLBACK=true`).
- The digital-pet state machine, allowed sound palette, auth/RBAC, booking state
  machine and crisis kill-switch remain system-level by design. They are
  invariants, not model calls.

Still local today and intentionally listed as remaining work:

- safety classifier (hard crisis patterns are the floor; model slot is reserved)
- audio embedding (browser acoustic signature; CLAP/PANNs slot is reserved)
- text-memory retrieval (recency; vector slot is reserved)
- avatar art/auto-rig (portrait + CSS motion; generation slot is reserved)

## Recommended strongest stack

| Capability | Primary choice | Fallback / alternative | Why |
| --- | --- | --- | --- |
| Conversation / persona | OpenAI flagship or Anthropic Claude Sonnet | Google Gemini Pro; DeepSeek | strongest instruction following and emotional nuance |
| Support-mode router | same family's small/fast model | HF Llama small | cheap, low latency classification |
| Safety | OpenAI Moderation / Azure AI Content Safety | dedicated self-harm classifier + LLM adjudicator | model recall + deterministic crisis kill-switch |
| Text memory embeddings | OpenAI `text-embedding-3-large` | Cohere Embed / Voyage / BGE-M3 | retrieval quality for long-term memory |
| Animal-sound embeddings | LAION CLAP | PANNs / YAMNet | audio–text and event similarity |
| Speech-to-text | Deepgram or OpenAI transcription | AssemblyAI / Whisper | low-latency voice input |
| Image generation | Flux or SDXL provider | OpenAI image / Scenario | visual quality and style control |
| 2D avatar art / auto-rig | Scenario / Leonardo / Flux for art; Live2D/Rive for rig | manual artist pass | no mature one-click 2D auto-rig API; art generation is the provider part |
| 2D animation runtime | **Rive** (open-source runtime) or Live2D/Spine | CSS/SVG rig | motion must be local: zero network latency, deterministic |
| Vector store | MongoDB Atlas Vector Search | Qdrant / Pinecone | memory + sound vectors next to data |
| Observability / eval | Langfuse | LangSmith / OpenTelemetry | traces, prompt versions, regression evals |

## The 2D avatar answer

Do **not** call a provider for every animation frame.

```text
host portrait / generated art
        ↓
rigged 2D asset (Rive / Live2D / Spine)
        ↓
local state machine: mood + behaviour + animation + sound
        ↓
60fps local rendering
```

Provider only belongs in the **offline asset pipeline**:

- generate a base portrait or expression sheet
- auto-remove background / segment parts
- optional auto-rig research step
- human review of the rig

The runtime animation should be local. That is stronger: no latency, no per-frame
cost, no outage, and the digital-pet planner remains the source of truth.

Reserved slots:

```text
AVATAR_GENERATION_PROVIDER / API_KEY / MODEL
AVATAR_RUNTIME=rive|live2d|spine|sprite
```

## Provider slots

| Slot | Required keys | Used for |
| --- | --- | --- |
| `chat` | `LLM_PRIMARY_API_KEY`, `LLM_PRIMARY_MODEL` | companion text |
| `chatFallback` | `LLM_FALLBACK_API_KEY`, `LLM_FALLBACK_MODEL` | provider outage |
| `classifier` | `CLASSIFIER_API_KEY`, `CLASSIFIER_MODEL` | support-mode routing |
| `safety` | `SAFETY_API_KEY`, `SAFETY_MODEL` | self-harm risk |
| `moderation` | `MODERATION_API_KEY` | content safety |
| `textEmbedding` | `TEXT_EMBEDDING_API_KEY`, `TEXT_EMBEDDING_MODEL` | memory retrieval |
| `audioEmbedding` | `AUDIO_EMBEDDING_API_KEY`, `AUDIO_EMBEDDING_MODEL` | host sound similarity |
| `image` | `IMAGE_API_KEY`, `IMAGE_MODEL` | optional generated image |
| `speechToText` | `STT_API_KEY`, `STT_MODEL` | server transcription |
| `avatarGeneration` | `AVATAR_GENERATION_API_KEY`, `AVATAR_GENERATION_MODEL` | offline art/rig |
| `avatarRuntime` | `AVATAR_RUNTIME` | local Rive/Live2D/Spine |
| `vectorStore` | `VECTOR_DB_URL` | memory/sound index |
| `observability` | `OBSERVABILITY_API_KEY` | traces/evals |

OpenAI-compatible base URLs are supported for chat: OpenAI, DeepSeek, Hugging
Face Router, OpenRouter, Groq and Gemini's OpenAI compatibility endpoint. A
provider-specific adapter can be added without changing the chat contract.

## Cost posture

Usage-based is expected. The expensive calls are chat and embedding; router and
safety classifiers should use small models. Cache safety classifications, cap
history/tokens, batch embeddings and keep audio analysis offline. Do not use a
flagship chat model for a 20-token intent classification.

## What to provide

1. Primary chat provider + key + model.
2. Fallback chat provider + key + model.
3. Safety/moderation provider + key (or approve OpenAI Moderation).
4. Text embedding provider + key.
5. Audio embedding provider + key (or approve HF CLAP).
6. STT provider + key.
7. Avatar generation provider if you want generated art; tell me Rive vs Live2D.
8. Optional vector store and Langfuse.

Keys go in environment variables only. Never commit them or paste them into the
public repository.
