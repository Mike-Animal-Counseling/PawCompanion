# PawCompanion

### A companionship app for pet people — online and offline.

PawCompanion is a full-stack consumer product, not a pet marketplace. It combines an AI companion you can talk to every day with real, bookable visits from verified shelters, cafés and trainers. One relationship, two delivery tracks, and a safety layer that treats a bad day as a product requirement.

[Demo](#demo) · [Product tour](#product-tour) · [How it works](#how-it-works) · [Engineering](#engineering) · [Case study](docs/CASE_STUDY.md) · [Publishing strategy](docs/PUBLISHING.md)

![PawCompanion member home](docs/screenshots/v2/app-home-member.webp)

> **Status:** portfolio-ready demo. The product is complete enough to review end to end; payments are sandboxed, AI is optional, and the safety operations are not a 24/7 clinical service. I would not put real users on this build without the launch work listed at the bottom.

**Stack:** React 19 · Vite 8 · Express 4 · MongoDB · Zod · JWT sessions · Playwright · Docker · GitHub Actions

**Verified:** 41 backend tests · 9-step Playwright E2E · green CI · Docker Compose smoke test

---

## The idea

Most apps for lonely pet lovers stop at a listing or a feed. The actual need is a relationship that shows up between visits.

PawCompanion makes that relationship concrete:

- **Online:** a daily check-in, a private journal, an AI companion with a personality and memory, a support mode when the day is heavy, and a visible bond that grows from messages and visits.
- **Offline:** a home visit, a walk, a café meetup or a 30-minute video call. Real availability, a real host decision, a real refund path.
- **Around it:** browsing, favourites, notifications, bookings, reviews, a partner console and an operator safety queue.

The design constraints were deliberate: low pressure, no engagement dark patterns, no diagnosis language, and no pretending that a sandbox payment is real.

![Guest discovery](docs/screenshots/v2/guest-home.webp)

---

## Product tour

### 1. A member home that is about today, not a catalogue

The signed-in home starts with a check-in, the next visit, the conversations you can continue, and a small set of recommendations. Discovery is below, not the first thing you see.

### 2. Online companionship: check in, talk, keep a thread

| Daily check-in | AI companion chat |
| --- | --- |
| ![Daily check-in](docs/screenshots/v2/app-checkin.webp) | ![Chat with a companion](docs/screenshots/v2/app-chat.webp) |

- One check-in per day: mood, energy, tags and an optional private note.
- A companion replies, the check-in joins the same conversation, and a seven-day chart plus streak make the relationship visible without turning it into a score.
- Support mode is chosen from intent, not sentiment. A high-risk message interrupts the model and returns crisis resources.
- Chat memory, a local persona fallback and optional hosted models share the same safety layer.

### 3. A companion profile that connects the two tracks

![Companion profile](docs/screenshots/v2/app-companion.webp)

The profile shows the host, reviews, the next opening, in-person and video-call pricing, and — for a signed-in guest — the private bond built from messages, visits and favourites.

### 4. Offline companionship: a booking that behaves like a real one

![Booking a visit](docs/screenshots/v2/app-booking.webp)

- Four services: home visit, walk & talk, café meetup, online video call.
- Server-computed pricing with an 8% service fee; the client never sends a price.
- Atomic slot reservation, 2-booking daily cap, host accept/decline, reschedule, cancellation with refund, completion and a review that recomputes ratings.
- The same visit appears correctly in the guest’s **My visits** and the partner’s **Bookings**.

### 5. Partner console

![Partner dashboard](docs/screenshots/v2/app-merchant-overview.webp)

- A 30-day dashboard with booking value, online/in-person split, repeat guests, top companions and recent reviews.
- Listings with photo upload, 21-day availability, visit decisions, review replies and business profile.
- A partner can see the guest contact needed for a visit, but never the guest’s chat or check-in data.

### 6. Operator console

![Operator safety queue](docs/screenshots/v2/app-admin-safety.webp)

- Safety queue with derived scores and timestamps — **no raw conversation text**.
- Acknowledge/resolve, partner suspension, listing/review moderation and an append-only audit trail.
- Every operator action is recorded and every queue decision is explicit.

### 7. A real mobile shell

<p align="center">
  <img src="docs/screenshots/v2/mobile-home.webp" width="300" alt="Mobile home with bottom tab bar" />
  <img src="docs/screenshots/v2/mobile-checkin.webp" width="300" alt="Mobile daily check-in" />
</p>

Bottom navigation, safe-area spacing, touch-sized controls, no horizontal overflow, PWA manifest and install shortcuts.

---

## Demo

Requires **Node.js 24+**.

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm run demo
```

This starts an in-memory MongoDB, seeds the demo, starts the API on `:5000` and the web app on `:3000`. The first run downloads a MongoDB binary once.

| Role | Email | Password |
| --- | --- | --- |
| Guest | `maya@example.com` | `PawCompanion!2026` |
| Partner | `hello@willowandwhiskers.example` | `MerchantDemo!2026` |
| Operator | `admin@pawcompanion.app` | `AdminDemo!2026` |

Docker demo: `docker compose up --build` → `http://localhost:8080`.

All seed identities, reviews and visits are fictional demo data.

---

## How it works

```mermaid
flowchart LR
  Guest[Guest web / PWA] --> API[Express API]
  Partner[Partner console] --> API
  Operator[Operator console] --> API
  API --> Mongo[(MongoDB)]
  API -. optional .-> Redis[(Redis budgets)]
  API -. optional .-> AI[Hugging Face chat / image]
  API --> Safety[Safety engine]
  Safety --> Risk[Derived risk profile + audit]
  API --> Booking[Booking engine]
  Booking --> Pay[Sandbox payment ledger]
```

**Online track:** `POST /checkins` → safety screen → companion reply → check-in row + chat memory.

**Offline track:** service → slot → atomic booking → sandbox payment → host decision → completion → review.

**Auth:** short-lived access JWT in memory + rotating refresh session in an HttpOnly cookie. Every request validates the session row, so logout and password changes are immediate.

More detail: [Architecture.md](Architecture.md), [API reference](docs/API.md), [Safety model](docs/SAFETY.md).

---

## Three hard problems

**1. Trust is not a footer disclaimer.**

High-risk language is detected before any model call. The reply becomes a crisis card with real resources. Risk events store a level and timestamp, never the message. Operators see only derived signals. The guest can delete all companion data.

**2. A booking is a state machine, not a POST.**

A partial unique index guarantees one live booking per companion/date/start time. Cancellations release the slot and refund the sandbox payment. Confirmed past visits are swept to completed; unconfirmed past requests are declined and refunded. Reviews are only possible once, after completion.

**3. Continuity is the product.**

The same companion appears in discovery, chat, check-in, favourites and visits. Messages, visits and favourites create a bond; the next visit, active chats and the check-in live on the member home. That continuity is why this feels like an app rather than a directory.

---

## Engineering

```bash
npm test              # 41 backend tests
npm run build         # lazy route chunks, no source maps
npm run e2e           # 9-step Playwright smoke test (demo running)
npm run check:privacy # scan tracked files for local paths / key material
```

- **Backend:** routers → services → models; Zod at every boundary; stable serializers; central error handling; request IDs and structured logs.
- **Auth:** rotating refresh sessions hashed in MongoDB, HttpOnly/SameSite cookies, per-email/IP credential budgets, session list/revoke, password change, account closure.
- **Rate limits:** shared Redis budgets when configured, bounded memory fallback for a single-instance demo.
- **Data integrity:** partial unique booking index, one check-in per day, one review per visit, one conversation per companion.
- **Frontend:** design tokens + CSS Modules, auth gate before route mount, route-level lazy loading, accessible dialogs/pickers, PWA service worker.
- **Deployment:** backend/frontend Dockerfiles, nginx same-origin proxy, compose demo, health/readiness, graceful shutdown.
- **Docs:** [case study](docs/CASE_STUDY.md), [architecture](Architecture.md), [API](docs/API.md), [safety](docs/SAFETY.md), [deployment](docs/DEPLOYMENT.md), [publishing](docs/PUBLISHING.md).

### Repository map

```
backend/src/
  routers/        auth, me, checkins, animals, favorites, bookings, ai, notifications, merchant, admin
  services/       scheduling, availability, booking, checkin, review, safety, risk, session, AI, analytics
  models/         Customer, Merchant, Admin, Session, Animal, Booking, Payment, Review, Favorite,
                  Checkin, ChatMemory, Notification, RiskEvent, UserRiskProfile, AuditEvent
  validators/     Zod request contracts
  serializers/    stable API shapes
  lib/            errors, logger, validation, IDs, time
frontend/src/
  pages/          public, guest, partner, operator
  components/     layout, design primitives, companion cards, chat, dashboard
  context/        auth, toast, favorites
  lib/            API client, formatting, constants
  styles/         tokens, base, shared UI
```

---

## What I would build next

- **Live payments:** Stripe PaymentIntents, webhooks, idempotency keys, real refund reconciliation.
- **Human online companionship:** scheduled audio/video sessions with vetted hosts, separate from the AI track.
- **Production safety ops:** on-call escalation, localised helplines, clinician-reviewed copy, consent and retention controls.
- **Recurring partner schedules:** weekly opening hours, holidays and travel time instead of per-date overrides.
- **Real-time layer:** WebSocket/SSE notifications and a shared host inbox.
- **PWA polish:** offline shell, install prompts and web push. Native shells and app-store distribution are intentionally out of scope; the product is a responsive web app.
- **Type contracts:** migrate to TypeScript and generate the client from OpenAPI.

---

## Honest limitations

This is not a production therapy or emergency service. It is companionship with a safety layer. There is no 24/7 human crisis team, no live payment processor, no email/SMS delivery, and no email verification or password reset. Native apps and app-store distribution are intentionally out of scope: this is a responsive web/PWA product. See [docs/SAFETY.md](docs/SAFETY.md) and [docs/PRODUCTION_SECURITY.md](docs/PRODUCTION_SECURITY.md) before any public launch.

## Publishing this project

The recommended setup is **one public code repo + one private deployment repo**: this repo is the portfolio and the complete implementation; the private repo holds only environment-specific infrastructure, secrets and operational configuration. It is also valid to keep one public repo and use GitHub Environments/Secrets. The decision, privacy checklist and launch path are in [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Documentation

| File | Contents |
| --- | --- |
| [docs/CASE_STUDY.md](docs/CASE_STUDY.md) | Problem, users, product bets, metrics, launch plan |
| [Architecture.md](Architecture.md) | Domain model, flows, auth, safety, trade-offs |
| [docs/API.md](docs/API.md) | Endpoint reference and examples |
| [docs/SAFETY.md](docs/SAFETY.md) | Crisis detection, support mode, risk scoring, privacy |
| [docs/IMAGES.md](docs/IMAGES.md) | Merchant image pipeline, limits, demo-asset policy |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, production configuration, operations |
| [docs/PUBLISHING.md](docs/PUBLISHING.md) | Public/private repo strategy and privacy audit |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Local setup, tests, conventions |
| [CHANGELOG.md](CHANGELOG.md) | What changed in 2.0 |

## License

ISC. See [LICENSE](LICENSE).
