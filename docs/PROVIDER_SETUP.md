# Provider setup checklist

This is the single page to use when you are ready to fill keys. It maps each
capability to a recommended provider, the exact environment variables, where to
get it, and what happens if it is empty.

> Put keys in `backend/.env` locally and in the Render dashboard for the demo.
> Never commit them. `VITE_*` variables are public; secrets must not use that
> prefix.

## Minimum to make chat work

Only the first block is required for the digital pet conversation:

```ini
ENABLE_AI=true
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_API_KEY=...
LLM_PRIMARY_MODEL=...
LLM_PRIMARY_ROUTER_MODEL=...
```

Without this, production chat returns `503` instead of a keyword reply. That is
the intended fail-closed behavior.

## Full capability matrix

| Capability | Recommended provider | Env keys | Where to get it | If empty |
| --- | --- | --- | --- | --- |
| Persona chat | OpenAI flagship or Anthropic Claude Sonnet | `LLM_PRIMARY_PROVIDER`, `LLM_PRIMARY_API_KEY`, `LLM_PRIMARY_MODEL` | platform.openai.com / console.anthropic.com | chat 503 |
| Chat fallback | another provider, or same provider's cheaper model | `LLM_FALLBACK_PROVIDER`, `LLM_FALLBACK_API_KEY`, `LLM_FALLBACK_MODEL` | provider console | only primary is tried |
| Support-mode router | small/fast model from the same family | `LLM_PRIMARY_ROUTER_MODEL` | provider console | no model router; production fails closed |
| Safety classifier | OpenAI Moderation / Azure AI Content Safety / dedicated classifier | `SAFETY_PROVIDER`, `SAFETY_API_KEY`, `SAFETY_MODEL` | provider console | hard crisis patterns only |
| Content moderation | OpenAI Moderation or equivalent | `MODERATION_PROVIDER`, `MODERATION_API_KEY`, `MODERATION_MODEL` | provider console | request/auth validation only |
| Text memory embeddings | OpenAI `text-embedding-3-large` / Cohere / Voyage | `TEXT_EMBEDDING_PROVIDER`, `TEXT_EMBEDDING_API_KEY`, `TEXT_EMBEDDING_MODEL` | provider console | recency-based memory |
| Animal-sound embeddings | LAION CLAP / PANNs / YAMNet | `AUDIO_EMBEDDING_PROVIDER`, `AUDIO_EMBEDDING_API_KEY`, `AUDIO_EMBEDDING_MODEL` | Hugging Face / Replicate / fal | browser `paw-acoustic-v1` |
| Speech-to-text | Deepgram / OpenAI / AssemblyAI | `STT_PROVIDER`, `STT_API_KEY`, `STT_MODEL` | provider console | browser Web Speech API |
| Image generation | Flux / SDXL / Scenario | `IMAGE_PROVIDER`, `IMAGE_API_KEY`, `IMAGE_MODEL` | provider console | no generated image |
| 2D avatar art / auto-rig | Scenario / Leonardo / Flux + Live2D/Rive rig | `AVATAR_GENERATION_PROVIDER`, `AVATAR_GENERATION_API_KEY`, `AVATAR_GENERATION_MODEL` | provider console | portrait + CSS motion |
| 2D avatar runtime | **Rive**, Live2D or Spine (local, no per-frame API) | `AVATAR_RUNTIME=rive\|live2d\|spine` | rive.app / live2d.com / esotericsoftware.com | CSS motion |
| Vector recall | MongoDB Atlas Vector Search / Qdrant / Pinecone | `VECTOR_DB_URL`, `VECTOR_DB_API_KEY`, `VECTOR_DB_COLLECTION` | Atlas / Qdrant / Pinecone | Mongo fields + recency |
| Tracing / evals | Langfuse / LangSmith / OTel | `OBSERVABILITY_PROVIDER`, `OBSERVABILITY_API_KEY`, `OBSERVABILITY_PROJECT` | langfuse.com / smith.langchain.com | structured logs only |

## Copy/paste block

Use this as the provider section of `backend/.env`:

```ini
ENABLE_AI=true

# Required for chat
LLM_PRIMARY_PROVIDER=
LLM_PRIMARY_BASE_URL=
LLM_PRIMARY_API_KEY=
LLM_PRIMARY_MODEL=
LLM_PRIMARY_ROUTER_MODEL=

# Optional resilience
LLM_FALLBACK_PROVIDER=
LLM_FALLBACK_BASE_URL=
LLM_FALLBACK_API_KEY=
LLM_FALLBACK_MODEL=

# Safety / moderation
SAFETY_PROVIDER=
SAFETY_BASE_URL=
SAFETY_API_KEY=
SAFETY_MODEL=
MODERATION_PROVIDER=
MODERATION_BASE_URL=
MODERATION_API_KEY=
MODERATION_MODEL=

# Memory / audio
TEXT_EMBEDDING_PROVIDER=
TEXT_EMBEDDING_BASE_URL=
TEXT_EMBEDDING_API_KEY=
TEXT_EMBEDDING_MODEL=
AUDIO_EMBEDDING_PROVIDER=
AUDIO_EMBEDDING_BASE_URL=
AUDIO_EMBEDDING_API_KEY=
AUDIO_EMBEDDING_MODEL=

# Voice / image
STT_PROVIDER=
STT_BASE_URL=
STT_API_KEY=
STT_MODEL=
IMAGE_PROVIDER=
IMAGE_BASE_URL=
IMAGE_API_KEY=
IMAGE_MODEL=

# 2D avatar: asset generation is optional; runtime is local
AVATAR_GENERATION_PROVIDER=
AVATAR_GENERATION_BASE_URL=
AVATAR_GENERATION_API_KEY=
AVATAR_GENERATION_MODEL=
AVATAR_RUNTIME=rive

# Retrieval / observability
VECTOR_DB_URL=
VECTOR_DB_API_KEY=
VECTOR_DB_COLLECTION=
OBSERVABILITY_PROVIDER=
OBSERVABILITY_API_KEY=
OBSERVABILITY_PROJECT=
```

`LLM_PRIMARY_BASE_URL` can be empty for OpenAI, DeepSeek, Hugging Face Router,
OpenRouter, Groq and Gemini's OpenAI-compatible endpoint. Set it for a
self-hosted gateway.

## 2D avatar: what the provider is for

Do not call a provider for every animation frame. The strong setup is:

```text
generated / host portrait
  → offline rig (Rive, Live2D or Spine)
  → local state machine driven by mood + behaviour
  → 60fps local rendering
```

- **Rive**: open-source runtime, good state machine, editor has free/paid tiers.
- **Live2D**: mature 2D character ecosystem; check SDK/commercial licensing.
- **Spine**: high-end animation; runtime/commercial license required.
- **Provider** is only for base art, background removal, expression sheets, or
  an auto-rig experiment. There is no reliable one-click 2D auto-rig API; plan
  for a human rig pass.

## Check what is configured

```bash
cd backend
npm run check:providers
```

It never prints secret values. It reports `configured` / `not configured` and
the exact missing variable names.

## What to prepare

- [ ] Primary chat provider + key + model
- [ ] Fallback chat provider + key + model
- [ ] Router model (small/fast)
- [ ] Safety/moderation provider + key
- [ ] Text embedding provider + key
- [ ] Audio embedding provider + key
- [ ] STT provider + key (only if server transcription is wanted)
- [ ] Image provider + key (optional)
- [ ] Avatar art provider + Rive/Live2D choice (optional)
- [ ] Vector store URL/key (optional until memory grows)
- [ ] Langfuse key (optional, recommended for evals)

When these are filled, the adapters can be switched from slot to live call
without changing the product contract.
