# AI provider setup

Companion chat, support-mode classification and onboarding extraction are
**provider-first** in production. Without a configured model they return a
clear `503`, not a silent keyword reply. A deterministic local stub is available
only for tests (`NODE_ENV=test` or `ALLOW_LOCAL_FALLBACK=true`).

## Configure a primary provider

Any OpenAI-compatible endpoint works:

```ini
ENABLE_AI=true
LLM_PRIMARY_PROVIDER=openai
LLM_PRIMARY_API_KEY=...
LLM_PRIMARY_MODEL=...
LLM_PRIMARY_ROUTER_MODEL=...
LLM_PRIMARY_BASE_URL=
```

`LLM_PRIMARY_BASE_URL` can be left empty for OpenAI, DeepSeek, Hugging Face
Router, OpenRouter, Groq and Gemini's OpenAI-compatible endpoint. Set it for a
self-hosted gateway.

Optional fallback:

```ini
LLM_FALLBACK_PROVIDER=...
LLM_FALLBACK_API_KEY=...
LLM_FALLBACK_MODEL=...
LLM_FALLBACK_BASE_URL=
```

The fallback is tried only after the primary fails or times out. If both fail,
the API returns `503`; it does not pretend to be the model.

See [PROVIDER_MATRIX.md](../docs/PROVIDER_MATRIX.md) for the full task-specific
stack: safety, moderation, text/audio embeddings, STT, image, avatar generation,
vector store and observability.

## Safety order

```
message
  → hard crisis patterns (deterministic safety floor, no network)
  → configured safety classifier / moderation
  → crisis response, if flagged (no persona call)
  → model mode router
  → model persona reply
```

The crisis floor is intentionally not delegated to an LLM: a model outage or a
bad classification must not suppress an explicit self-harm message. This is a
safety invariant, not a demo fallback.

## Privacy and cost controls

- Provider requests have a 20-second timeout and bounded response size.
- Chat history is capped at 80 messages; model context is capped separately.
- Per-user, per-IP and global chat budgets apply in `app.js`.
- Provider keys are server-side only; never expose them through `VITE_*`.
- Set billing limits at the provider. The router uses a smaller model than the
  persona reply.
- Do not enable production chat without a privacy review and consent copy.

## Personas

`src/services/personalityProfiles.js` defines the voice of each species and
personality. Listings can set `personalityProfile`; otherwise a species default
is used. The digital-pet planner supplies mood, body, animation and the allowed
sound to the model; it is not allowed to invent an audio file.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `AI_UNAVAILABLE` / 503 | `ENABLE_AI=true` and a primary key/model are configured |
| 401/403 from provider | Key, account status, model access |
| 429 from provider | Quota/rate limit; configure `LLM_FALLBACK_*` |
| Replies feel generic | Wrong model or missing digital profile; check `routeMeta.provider` |
| No image | Image provider slot is not wired; images are optional |
| Safety never flags | Hard crisis patterns are local; verify the message matches; classifier is optional |
