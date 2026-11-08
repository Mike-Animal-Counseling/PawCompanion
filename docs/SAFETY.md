# Safety model

PawCompanion offers companionship. It is **not therapy, diagnosis, medical advice, or an emergency service**. This document is the operating model behind the safety centre in the product.

## Scope

The safety system covers:

1. The companion's AI chat (`POST /api/ai/chat`).
2. Daily check-in notes (`POST /api/checkins`).
3. A private risk profile derived from both.
4. A human operator review queue.
5. Crisis resources shown in the UI and inside the conversation.

It does not cover real-world emergencies. If someone is in immediate danger, local emergency services are the correct response.

## Detection layers

| Layer | Runs | Effect |
| --- | --- | --- |
| Hard keyword patterns (English + Chinese) | Synchronously, no network | Interrupts the conversation with a crisis card |
| Medium keyword patterns | Synchronously | Raises a support event without interrupting |
| Hugging Face `sentinet/suicidality` classifier | Only when a key is configured | Can raise the level to medium/high; failures fall back to keywords |
| Local intent heuristic | Always | Chooses play/support support mode when no model router is configured |
| LLM router | When configured | Chooses play/support; cannot bypass the safety layer |

The safety check runs **before** any model call. A flagged message never receives a generated reply.

## Risk profile

- Each medium/high event stores a level, score, source, companion id and timestamp. Raw message text is never stored in the risk log.
- Scores decay exponentially: 7-day half-life 3 days, 30-day half-life 10 days.
- Status thresholds:
  - `flagged`: 30-day score ≥ 18 **or** two high events within 7 days.
  - `watch`: 7-day score ≥ 10.
  - `ok`: otherwise.
- The profile is shown to the guest as a compassionate summary, not a diagnosis. The guest can delete all companion data.
- Operators see the derived signals and can acknowledge or resolve them. Their action is recorded in the audit trail.
- `RiskEvent` has a 120-day TTL; the profile row itself is removed on guest deletion.

## Support mode

When distress is detected, the companion:

- Switches to a slower rhythm (STF-N-style: situation, thought, feeling, next).
- Validates first and asks at most one question per message.
- Avoids diagnosis, clinical claims and promises of confidentiality.
- Never claims to be human or a therapist.
- Surfaces crisis resources rather than continuing the role-play when a high-risk signal appears.
- Locks support mode for a few turns so a short "I'm fine" does not immediately snap back to play.

The mode is visible in the chat header and sidebar. Hiding it would make the behaviour feel unpredictable.

## Crisis response

The crisis card:

- States that the person deserves support from a human right now.
- Gives **US 988** (call/text), **findahelpline.com** for other countries, and emergency services.
- Invites the guest to stay in the conversation.
- Is stored in the thread with `meta.type = "crisis"` so it renders consistently in history.
- Does **not** contact emergency services, notify a third party automatically, or promise confidentiality.

Helplines and localisation must be reviewed before launching in a new country.

## Human review

- Watch/flagged profiles appear in the operator safety queue with scores, event counts, last signal and the guest's account name/email.
- Operators can open derived events (level, score, source, timestamp) and acknowledge or resolve the profile.
- Operators never see raw chat text or check-in notes.
- Resolving a profile is an explicit override; it does not erase history.
- The audit trail records the operator, action, target and timestamp.
- There is no on-call rota or guaranteed response time in this build. A real deployment needs a documented escalation policy.

## Data and retention

| Data | Visibility | Retention |
| --- | --- | --- |
| Chat messages | Guest only | Until the guest clears the thread/account |
| Check-in notes and replies | Guest only | Until deleted with companion data or account |
| Risk events | Derived; operator sees level/score/timestamp | 120 days TTL |
| Risk profile | Guest summary + operator queue | Until deletion |
| Booking contact | Guest + host | Account lifetime; anonymised on account deletion |
| Payments | Guest + operator | Financial record; no real money in sandbox |
| Audit events | Operators | Append-only; operational retention policy required |

The guest can delete chats, check-ins and risk data from **Account → Safety & data**. Account closure removes companion data and anonymises booking contact details.

## Consent and disclosure

- Registration includes a plain-language acknowledgement that PawCompanion is companionship, not therapy, and that support mode may share crisis resources.
- The chat UI keeps a short disclaimer visible.
- The safety centre explains the model publicly at `/safety`.
- AI/provider use, data retention and crisis limitations are documented in the README and deployment docs.

## Testing and change control

Safety-sensitive changes must keep or add tests for:

- High-risk English and Chinese phrases.
- Medium-risk phrasing that should not interrupt.
- Ordinary messages that must remain `none`.
- A flagged check-in returning resources and not a model reply.
- Risk-event creation without raw text.
- Operator visibility of derived data only.
- Account/data deletion.

Run `npm test` in `backend/`. The safety unit tests are in `tests/safety.test.js`; integration coverage is in `tests/checkins.test.js`.

## Known limitations

- Keyword lists are finite and culturally specific; they are a floor, not a complete detector.
- The optional classifier can be unavailable; the keyword layer still runs.
- There is no human 24/7 monitoring, no clinical supervision and no localised helpline database.
- The system does not assess imminent risk with a validated instrument.
- Conversation context and model output can still be wrong or unhelpful.

These limitations must be stated honestly wherever the product is deployed.
