# AI companion setup

The online companionship track works **without any provider key**. The same routes and screens are used in both modes:

| Mode | When | Behaviour |
| --- | --- | --- |
| Demo voice | `ENABLE_AI=false` or no key | Local persona replies, local support mode, no image generation |
| Model voice | `ENABLE_AI=true` + key | Hosted chat, optional image generation, same safety layer |

## Enable a hosted model

```ini
ENABLE_AI=true
HUGGINGFACE_API_KEY=hf_…
HF_CHAT_MODEL=meta-llama/Llama-3.1-8B-Instruct
HF_ROUTER_MODEL=meta-llama/Llama-3.2-3B-Instruct
HF_IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
HF_MAX_TOKENS=220
HF_TEMPERATURE=0.7
HF_ROUTER_THRESHOLD=0.55
```

Optional image generation is used only in play mode and only when the key is present. A provider failure resolves to `null`; the chat still succeeds. Chat fallback also applies if the model errors, so a provider outage does not produce a 500 page.

## Safety order

```
message
  → local high-risk keywords (English + Chinese)
  → optional suicidality classifier
  → crisis response, if flagged (no model call)
  → mode router (model or local heuristic)
  → persona reply
```

The router cannot bypass the safety layer. Raw message text is never written to the risk log. See [docs/SAFETY.md](../docs/SAFETY.md).

## Privacy and cost controls

- Provider responses are bounded (1 MB) and requests have a 20-second timeout.
- Chat history is capped at 80 messages; model context is capped separately.
- Per-user, per-IP and global chat budgets apply in `app.js`.
- Do not enable AI in production without a privacy review, consent copy and billing limits.
- The provider key is server-side only; never expose it through `VITE_*`.

## Personas

`src/services/personalityProfiles.js` defines the voice of each species/personality. Listings can set `personalityProfile` to one of the keys; otherwise a species default is used. The local fallback uses the same profile's greeting/comfort/play lines, so the demo still sounds like the companion.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Replies feel generic | `ENABLE_AI`/key not set, or provider auth error; check `provider` in the chat response meta |
| 429 from provider | Upstream quota; the local fallback should take over |
| No image | Image model/key missing; images are optional and play-mode only |
| Safety never flags | Keyword layer is local; ensure the message actually matches a risk pattern, then check tests |
